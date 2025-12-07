import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.metrics import accuracy_score, confusion_matrix
import os
import json
from datetime import datetime

# ==========================================
# CONFIGURATION
# ==========================================
# Point this to the specific model you want to test
MODEL_PATH = "./models/multiclass_model_20251204_064956.json" 
OUTPUT_DIR = "test_results"

def create_dummy_data(num_samples=50):
    """
    Generates dummy data for Multiclass Classification (0=Normal, 1=FDI, 2=DoS).
    """
    np.random.seed(42)
    
    # Generate 3 types of scenarios roughly equally
    # 0: Normal (120V, 15A, 40C)
    # 1: FDI (150V, 15A, 40C)
    # 2: DoS (100V, 40A, 85C)
    
    scenarios = []
    for _ in range(num_samples):
        choice = np.random.randint(0, 3)
        if choice == 0:
            scenarios.append([np.random.normal(120, 2), np.random.normal(15, 2), np.random.normal(40, 5), 0])
        elif choice == 1:
            scenarios.append([np.random.normal(150, 10), np.random.normal(15, 2), np.random.normal(40, 5), 1])
        elif choice == 2:
            scenarios.append([np.random.normal(100, 5), np.random.normal(40, 5), np.random.normal(85, 5), 2])

    df = pd.DataFrame(scenarios, columns=['voltage', 'current', 'temperature', 'label'])
    return df

def load_saved_model(filepath):
    # Setup a fresh classifier
    model = xgb.XGBClassifier()

    if not os.path.exists(filepath):
        print(f"Note: Model file not found at {filepath}. Using a fresh instance for demo.")
        # We must 'fit' it on dummy data so it doesn't crash during prediction
        X_dummy, y_dummy = prepare_data(None)
        model.fit(X_dummy, y_dummy)
        return model

    print(f"Loading model from: {filepath}")
    model.load_model(filepath)
    return model

def prepare_data(csv_path=None):
    if csv_path and os.path.exists(csv_path):
        print(f"Loading data from {csv_path}...")
        df = pd.read_csv(csv_path)
    else:
        print("Generating dummy testing data...")
        df = create_dummy_data()

    # UPDATED: Target is 'label'
    target_col = 'label'
    
    if target_col in df.columns:
        X = df.drop(columns=[target_col])
        y = df[target_col]
    else:
        X = df
        y = None 
    return X, y

def save_results_to_json(model_path, predictions, y_true=None, metrics=None):
    """
    Saves results in a format the React Client can graph.
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{OUTPUT_DIR}/test_output_{timestamp}.json"
    
    # 1. Format for Bar Chart (Distribution of Predictions)
    # Count how many of each class we predicted
    unique, counts = np.unique(predictions, return_counts=True)
    pred_counts = dict(zip(unique, counts))
    
    # Ensure all classes 0, 1, 2 are present even if count is 0
    chart_data = []
    class_names = {0: "Normal", 1: "FDI", 2: "DoS"}
    
    for i in range(3):
        chart_data.append({
            "name": class_names[i],
            "count": int(pred_counts.get(i, 0)),
            "fill": "#8884d8" # Hex color for React charts
        })

    # 2. Detailed Logs (Table Data)
    logs = []
    if y_true is not None:
        y_list = y_true.tolist()
        for i, pred in enumerate(predictions):
            logs.append({
                "id": i,
                "predicted": int(pred),
                "actual": int(y_list[i]),
                "is_correct": int(pred) == int(y_list[i])
            })
    else:
        for i, pred in enumerate(predictions):
            logs.append({
                "id": i,
                "predicted": int(pred)
            })

    # 3. Construct Final Object
    output_data = {
        "meta": {
            "timestamp": timestamp,
            "model_used": model_path,
            "total_samples": len(predictions)
        },
        "metrics": metrics if metrics else {},
        "chartData": chart_data, # <--- UPDATED for Bar Chart
        "logs": logs
    }

    with open(filename, 'w') as f:
        json.dump(output_data, f, indent=4, default=str)
        
    print(f"Results saved to: {filename}")
    return filename

def test_model(model, X, y_true=None):
    print("\nRunning Predictions...")
    
    predictions = model.predict(X)

    metrics = {}

    if y_true is not None:
        # UPDATED: Calculate Accuracy
        acc = accuracy_score(y_true, predictions)
        print(f"Test Set Accuracy: {acc * 100:.2f}%")
        
        # Calculate per-class breakdown (Confusion Matrix diagonal)
        cm = confusion_matrix(y_true, predictions)
        
        metrics = {
            "accuracy": round(acc, 4),
            "confusion_matrix": cm.tolist()
        }
    
    return predictions, metrics

# ==========================================
# MAIN EXECUTION
# ==========================================
if __name__ == "__main__":
    
    # 1. Load Model
    # Note: If file at MODEL_PATH doesn't exist, it creates a dummy one
    model = load_saved_model(MODEL_PATH)

    # 2. Get Data
    # Pass a real CSV path here if you have new logs to test
    X_new, y_new = prepare_data() 
    
    # 3. Run Inference
    preds, metrics_data = test_model(model, X_new, y_new)
    
    # 4. Save Results
    saved_file = save_results_to_json(MODEL_PATH, preds, y_new, metrics_data)