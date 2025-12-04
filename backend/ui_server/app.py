from flask import Flask, jsonify
from flask_cors import CORS
import time

app = Flask(__name__)
# Enable CORS for all domains on all routes
CORS(app)

@app.route('/v1/resources', methods=['GET'])
def get_resources():
    # Simulate a database lookup or processing time
    # This matches the delay simulation in your React frontend
    time.sleep(0.5)

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
                "type": "Gradient Boosting" 
            },
            { 
                "id": "m2", 
                "name": "Random Forest Light", 
                "type": "Ensemble" 
            },
            { 
                "id": "m3", 
                "name": "Neural Net Deep", 
                "type": "Deep Learning" 
            },
            { 
                "id": "m4", 
                "name": "Transformer v3", 
                "type": "Attention Mechanism" 
            }
        ]
    }

    return jsonify(response_data)

if __name__ == '__main__':
    # Run on port 5000 (default)
    app.run(debug=True, port=5000)