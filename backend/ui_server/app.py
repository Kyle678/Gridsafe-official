from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)

# This allows your React app (on localhost) to talk to this API
CORS(app) 

@app.route('/api/testing-sets', methods=['GET'])
def get_testing_sets():
    # In a real app, you would query your database here.
    # For now, we return the structure your React UI expects.
    
    mock_data = {
        "testing_sets": [
            {
                "id": 1,
                "name": "OTI Grid Normal Operation",
                "date": "2025-12-01",
                "records": 5000,
                "status": "Ready",
                "model_data": "raw_logs/grid_normal_v1.csv"
            },
            {
                "id": 2,
                "name": "OTI Grid High Load Event",
                "date": "2025-12-02",
                "records": 1200,
                "status": "Ready",
                "model_data": "raw_logs/grid_stress_v2.csv"
            },
            {
                "id": 3,
                "name": "Shear Strength Anomalies",
                "date": "2025-11-28",
                "records": 850,
                "status": "Archived", 
                "model_data": "raw_logs/shear_failures.csv"
            }
        ]
    }
    
    return jsonify(mock_data)

if __name__ == '__main__':
    app.run(debug=True, port=5000)