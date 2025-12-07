import os
# Assuming you saved the library code above as easy_xgb.py
from XGridBoost import XGridBoost 

# 1. Configuration matching your generator
DATA_PATH = os.path.join("training_data", "grid_multiclass_data.csv")

# 2. Initialize the Multi-class Wrapper
# We use 'multiclass' because you have labels 0 (Normal), 1 (FDI), 2 (DoS)
grid_model = XGridBoost(task_type='multiclass')

try:
    # 3. Load Data using the new helper method
    # It returns X (Voltage, Current, Temp) and y (Label)
    X, y = grid_model.load_data(filepath=DATA_PATH, label_col='label')

    # 4. Train
    # This automatically detects you have 3 classes and sets the params
    grid_model.train(X, y)

    # 5. Save the trained model
    grid_model.save("grid_security_model")
    
    # 6. Test on a fake manual entry (simulating a DoS attack)
    # Voltage drop (100), High Current (45), High Temp (80) -> Should be Class 2
    import pandas as pd
    test_log = pd.DataFrame({
        'voltage': [100.5], 
        'current': [45.2], 
        'temperature': [80.1]
    })
    
    prediction = grid_model.predict(test_log)
    print(f"Manual Test Prediction: Class {int(prediction[0])} (0=Normal, 1=FDI, 2=DoS)")

except FileNotFoundError:
    print("Run your data generation script first to create the CSV!")