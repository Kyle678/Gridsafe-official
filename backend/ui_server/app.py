from flask import Flask, jsonify, request
from flask_cors import CORS
import time
import random

app = Flask(__name__)
# Enable CORS for all domains on all routes
CORS(app)

@app.route('/api/resources', methods=['GET'])
def get_resources():

    # The data structure matches exactly what your App.jsx expects
    response_data = {
        "trainingSets": [
            { 
                "id": "s1", 
                "name": "Training Set Alpha (Live)", 
                "size": "1.2 GB • 52k Samples" 
            },
            { 
                "id": "s2", 
                "name": "Training Set Beta (Live)", 
                "size": "2.4 GB • 125k Samples" 
            },
            { 
                "id": "s3", 
                "name": "Training Set Gamma (Live)", 
                "size": "800 MB • 28k Samples" 
            },
            { 
                "id": "s4", 
                "name": "Archived Set Omega", 
                "size": "5.1 GB • 500k Samples" 
            }
        ],
        "models": [
            { 
                "id": "m1", 
                "name": "XGBoost v2.1", 
                "type": "Gradient Boosting",
                "isConfigurable": True
            },
            { 
                "id": "m2", 
                "name": "Random Forest Light", 
                "type": "Ensemble",
                "isConfigurable": True
            },
            { 
                "id": "m3", 
                "name": "Neural Net Deep", 
                "type": "Deep Learning",
                "isConfigurable": True
            },
            { 
                "id": "m4", 
                "name": "Transformer v3", 
                "type": "Attention Mechanism",
                "isConfigurable": False
            }],
        "trainedModels": [
            { 
                "id": "tm1", 
                "name": "XGBoost on Alpha - Jan 2024", 
                "type": "Gradient Boosting",
                "r2_score": 0.82
            },
            { 
                "id": "tm2", 
                "name": "Random Forest on Beta - Feb 2024", 
                "type": "Ensemble",
                "r2_score": 0.76
            },
            { 
                "id": "tm3", 
                "name": "Neural Net on Gamma - Mar 20245", 
                "type": "Deep Learning",
                "r2_score": 0.89
            }   
        ]
    }

    return jsonify(response_data)

@app.route('/api/train', methods=['POST'])
def start_training():
    # Parse the JSON sent from React
    data = request.get_json()
    
    # Extract inputs
    run_name = data.get('runName')
    dataset_id = data.get('datasetId')
    model_id = data.get('modelId')
    hyperparams = data.get('hyperparameters', {})
    
    print(f"Starting training run: {run_name}")
    print(f"Dataset: {dataset_id}, Model: {model_id}, Params: {hyperparams}")

    # --- SIMULATION LOGIC ---
    # In a real app, you would load your dataframe and train your model here.
    # Below, we generate mock data to visualize the scatter plot.
    
    points = []
    actual_values = []
    predicted_values = []
    
    # Determine "accuracy" based on model type (just for simulation flavor)
    noise_level = 0.5
    if model_id == 'm3': noise_level = 0.2  # Deep learning is tighter
    if model_id == 'm2': noise_level = 0.8  # Random forest is noisier
    
    # Adjust based on learning rate if provided
    lr = hyperparams.get('learningRate', 0.01)
    if lr > 0.1: noise_level += 0.5 # High learning rate causes jitter

    # Generate 50 sample points
    for _ in range(50):
        # Create a random Actual value (x) between 0 and 10
        actual = random.uniform(0, 10)
        
        # Create a Predicted value (y) that is close to x, plus noise
        # y = x + random_noise
        noise = random.gauss(0, noise_level)
        predicted = actual + noise
        
        # Clamp to 0 (cannot have negative shear strength)
        predicted = max(0, predicted)
        
        points.append({ "x": round(actual, 2), "y": round(predicted, 2) })
        
        actual_values.append(actual)
        predicted_values.append(predicted)

    # Calculate a mock R2 score
    # Simple calculation: 1 - (residual_sum_squares / total_sum_squares)
    mean_actual = sum(actual_values) / len(actual_values)
    ss_tot = sum((x - mean_actual) ** 2 for x in actual_values)
    ss_res = sum((x - y) ** 2 for x, y in zip(actual_values, predicted_values))
    
    r2_score = 1 - (ss_res / ss_tot)
    
    # Simulate processing time
    time.sleep(1.5)

    # Return the response structure expected by the React frontend
    return jsonify({
        "status": "success",
        "runName": run_name,
        "r2_score": max(0, min(1, r2_score)), # Clamp between 0 and 1
        "points": points
    })

if __name__ == '__main__':
    # Run on port 5000 (default)
    app.run(debug=True, port=5000)