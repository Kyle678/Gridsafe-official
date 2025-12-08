from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import threading
import pandas as pd
from XGridBoost import XGridBoost
from generate_logs import generate_multiclass_data

app = Flask(__name__)
CORS(app)  # Allow React to talk to Flask

# Configuration
DATASETS_DIR = "datasets"
os.makedirs(DATASETS_DIR, exist_ok=True)

# ---------------------------------------------------------
# HELPER: Background Training Thread
# ---------------------------------------------------------
def run_training_task(filename, label_col, model_type, task_type, params):
    """
    Runs the EasyModel training in a separate thread.
    """
    try:
        print(f"--- Background Task Started: {model_type} on {filename} ---")
        
        # 1. Initialize the library with the user's choices
        bot = XGridBoost(model_type=model_type, task_type=task_type)
        
        # 2. Construct full path
        filepath = os.path.join(DATASETS_DIR, filename)

        # 3. Load Data
        # We wrap this in try/except to catch CSV errors early
        try:
            X, y = bot.load_data(filepath, label_col)
        except Exception as e:
            print(f"Data Load Error: {e}")
            return

        # 4. Train
        # The library handles the logic for different model types internally
        bot.train(X, y, params=params)
        
        print(f"--- Background Task Complete: Results in /latest ---")
        
    except Exception as e:
        print(f"CRITICAL WORKER ERROR: {e}")

def find_saved_models(base_dir="test_results"):
    models = []
    if not os.path.exists(base_dir): return models
    
    # Walk through run folders to find .json (XGB) or .pkl (RF/Linear) files
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith(".json") or file.endswith(".pkl"):
                full_path = os.path.join(root, file)
                # Create a friendly name
                folder_name = os.path.basename(root)
                models.append({
                    "id": full_path, # We use the full path as the ID
                    "name": f"{folder_name} - {file}",
                    "type": "XGBoost" if file.endswith(".json") else "Scikit-Learn"
                })
    return models

# ---------------------------------------------------------
# BACKGROUND WORKER: Test
# ---------------------------------------------------------
def run_testing_task(model_path, dataset_file, label_col):
    try:
        # We don't need model_type here, the load_model method detects it
        bot = XGridBoost() 
        data_path = os.path.join(DATASETS_DIR, dataset_file)
        bot.evaluate_saved_model(model_path, data_path, label_col)
    except Exception as e:
        print(f"TESTING ERROR: {e}")

# ---------------------------------------------------------
# ENDPOINTS
# ---------------------------------------------------------

@app.route('/api/options', methods=['GET'])
def get_options():
    """
    Returns the configuration options available in your library.
    This allows the frontend to dynamically generate dropdowns.
    """
    return jsonify({
        "model_types": ["xgboost", "random_forest", "linear"],
        "task_types": ["multiclass", "classification", "regression"]
    })

@app.route('/api/datasets', methods=['GET'])
def get_datasets():
    """Scans the /datasets folder and returns CSV files."""
    try:
        files = [f for f in os.listdir(DATASETS_DIR) if f.endswith('.csv')]
        return jsonify({"datasets": files})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/train', methods=['POST'])
def train_model():
    """
    Receives JSON payload to trigger training.
    """
    data = request.json
    
    # Extract fields with defaults
    filename = data.get('dataset')
    label_col = data.get('label_col')
    model_type = data.get('model_type', 'xgboost')
    task_type = data.get('task_type', 'multiclass')
    params = data.get('params', {}) # e.g. {'max_depth': 4, 'n_estimators': 50}

    # Basic Validation
    if not filename or not label_col:
        return jsonify({"error": "Missing 'dataset' or 'label_col'"}), 400

    if not os.path.exists(os.path.join(DATASETS_DIR, filename)):
        return jsonify({"error": "Dataset not found"}), 404

    # Run training in background thread
    thread = threading.Thread(
        target=run_training_task, 
        args=(filename, label_col, model_type, task_type, params)
    )
    thread.start()

    return jsonify({
        "message": "Training started.",
        "status": "processing",
        "config": {
            "model": model_type,
            "task": task_type,
            "file": filename
        }
    })

@app.route('/api/results/latest', methods=['GET'])
def get_latest_results():
    """
    Returns the text report AND a list of available image filenames.
    """
    latest_dir = os.path.join("test_results", "latest")
    response = {
        "status": "pending", 
        "report": "No results available.", 
        "images": [] 
    }
    
    if os.path.exists(latest_dir):
        # 1. Read Report
        report_path = os.path.join(latest_dir, "evaluation_report.txt")
        if os.path.exists(report_path):
            with open(report_path, 'r') as f:
                response["report"] = f.read()
            response["status"] = "ready"
        
        # 2. Scan for Images (.png)
        # This will find 'confusion_matrix.png', 'training_loss_curve.png', etc.
        image_files = [f for f in os.listdir(latest_dir) if f.endswith('.png')]
        response["images"] = image_files
        
    return jsonify(response)

@app.route('/api/results/latest/image/<filename>', methods=['GET'])
def get_image(filename):
    """
    Serves the actual image file (png) to the frontend.
    """
    # We use os.getcwd() to ensure we have the absolute path to the project root
    latest_dir = os.path.join(os.getcwd(), "test_results", "latest")
    return send_from_directory(latest_dir, filename)

@app.route('/api/models', methods=['GET'])
def get_trained_models():
    """Returns list of saved models found in test_results/"""
    return jsonify({"models": find_saved_models()})

@app.route('/api/test', methods=['POST'])
def test_model():
    data = request.json
    model_path = data.get('model_path')
    dataset = data.get('dataset')
    label_col = data.get('label_col', 'label') # Default to 'label'
    
    if not model_path or not dataset:
        return jsonify({"error": "Missing model_path or dataset"}), 400
        
    thread = threading.Thread(
        target=run_testing_task,
        args=(model_path, dataset, label_col)
    )
    thread.start()
    
    return jsonify({"status": "processing", "message": "Testing started"})

@app.route('/api/results/test_latest', methods=['GET'])
def get_test_results():
    """Specific endpoint for fetching TEST results (distinct from training results)"""
    latest_dir = os.path.join("test_results", "latest_test")
    response = {"status": "pending", "report": "", "images": []}
    
    if os.path.exists(latest_dir):
        report_path = os.path.join(latest_dir, "evaluation_report.txt")
        if os.path.exists(report_path):
            with open(report_path, 'r') as f:
                response["report"] = f.read()
            
            # Find images
            response["images"] = [f for f in os.listdir(latest_dir) if f.endswith('.png')]
            response["status"] = "ready"
            
    return jsonify(response)

@app.route('/api/results/test_latest/image/<filename>', methods=['GET'])
def get_test_image(filename):
    """Serves images from the latest_test folder"""
    latest_dir = os.path.join(os.getcwd(), "test_results", "latest_test")
    return send_from_directory(latest_dir, filename)

@app.route('/api/generate', methods=['POST'])
def generate_data():
    try:
        data = request.json
        
        total_samples = int(data.get('total_samples', 3000))
        
        # New: Expecting specific percents, e.g. {"fdi": 10, "dos": 5}
        fdi_percent = float(data.get('fdi_percent', 0))
        dos_percent = float(data.get('dos_percent', 0))
        
        # Convert to ratios (0.1, 0.05)
        attack_ratios = {
            'fdi': fdi_percent / 100.0,
            'dos': dos_percent / 100.0
        }
        
        result = generate_multiclass_data(
            total_samples=total_samples, 
            attack_ratios=attack_ratios
        )
        
        return jsonify({"status": "success", "details": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/simulate', methods=['POST'])
def simulate_model():
    """
    Runs a model against a dataset and returns row-by-row predictions
    for the frontend to 'playback'.
    """
    try:
        data = request.json
        model_path = data.get('model_path')
        dataset = data.get('dataset')
        
        if not model_path or not dataset:
            return jsonify({"error": "Missing params"}), 400

        # 1. Load Model
        bot = XGridBoost()
        bot.load_model(model_path)
        
        # 2. Get Data Paths
        data_path = os.path.join(DATASETS_DIR, dataset)
        label_col = data.get('label_col', 'label')

        # 3. Generate Predictions (Using the clean, training-ready data)
        # bot.load_data handles dropping 'timestamp' automatically so the model doesn't crash
        X, y = bot.load_data(data_path, label_col) 
        preds = bot.predict(X)
        
        # 4. Prepare Response Data (Need to recover timestamps!)
        # We read the raw file again because 'X' has stripped the metadata columns.
        # We want the frontend to receive the full context (timestamps, IDs, etc.)
        df_full = pd.read_csv(data_path)
        
        # Append the prediction results to the full dataframe
        df_full['predicted'] = preds
        
        # Standardize the label column name for the frontend
        if label_col in df_full.columns:
            df_full['actual'] = df_full[label_col]
        else:
            df_full['actual'] = 0 # Fallback if label is missing

        # Ensure timestamp is string-formatted for JSON (avoids serialization errors)
        if 'timestamp' in df_full.columns:
            df_full['timestamp'] = df_full['timestamp'].astype(str)

        # 5. Convert to JSON
        # We limit to 2000 rows by default to prevent crashing the browser if the file is huge
        if len(df_full) > 2000:
            df_full = df_full.head(2000)

        result_json = df_full.to_dict(orient='records')
        
        return jsonify({"status": "success", "data": result_json})

    except Exception as e:
        print(f"Simulation Error: {e}")
        # traceback.print_exc() # Uncomment if you need deep debugging
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)