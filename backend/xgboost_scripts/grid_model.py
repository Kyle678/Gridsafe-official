import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error
import matplotlib.pyplot as plt
import os
from datetime import datetime

# ==========================================
# 1. THE FLEXIBLE TRAINING FUNCTION
# ==========================================

def train_custom_model(
    df, 
    model_type="xgboost", 
    custom_name=None, 
    hyperparameters=None
):
    """
    Args:
        df (pd.DataFrame): The dataset.
        model_type (str): 'xgboost' or 'random_forest'.
        custom_name (str): Optional name for the file.
        hyperparameters (dict): Dictionary of model settings (lr, depth, etc).
    """
    
    # --- 1. Setup Defaults & ID ---
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Handle Naming Logic
    if custom_name and custom_name.strip():
        # Clean the name and append ID to ensure file uniqueness on disk
        clean_name = "".join(x for x in custom_name if x.isalnum() or x in "_-")
        model_identifier = f"{clean_name}_{run_id}"
        display_name = custom_name
    else:
        model_identifier = f"model_{run_id}"
        display_name = f"Grid Model {run_id}"

    # Handle Hyperparameters Defaults
    params = hyperparameters if hyperparameters else {}
    
    # Create dirs
    os.makedirs("models", exist_ok=True)
    os.makedirs("plots", exist_ok=True)

    print(f"Starting Run: {display_name} ({model_type})")

    # --- 2. Preprocessing ---
    target_column = 'shear_strength_actual'
    X = df.drop(columns=[target_column])
    y = df[target_column]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # --- 3. Model Initialization & Training ---
    model = None
    plot_path = None
    
    if model_type.lower() == "xgboost":
        # Extract specific params with defaults
        n_estimators = int(params.get('n_estimators', 150))
        learning_rate = float(params.get('learning_rate', 0.05))
        max_depth = int(params.get('max_depth', 6))
        
        print(f"Configuring XGBoost: LR={learning_rate}, Depth={max_depth}...")

        model = xgb.XGBRegressor(
            objective='reg:squarederror',
            n_estimators=n_estimators,
            learning_rate=learning_rate,
            max_depth=max_depth,
            eval_metric='rmse'
        )
        
        # Train with eval set for plotting
        model.fit(
            X_train, y_train,
            eval_set=[(X_train, y_train), (X_test, y_test)],
            verbose=False
        )
        
        # Generate XGBoost Training Plot
        evals_result = model.evals_result()
        epochs = len(evals_result['validation_0']['rmse'])
        x_axis = range(0, epochs)
        
        plt.figure(figsize=(10, 6))
        plt.plot(x_axis, evals_result['validation_0']['rmse'], label='Train RMSE')
        plt.plot(x_axis, evals_result['validation_1']['rmse'], label='Test RMSE')
        plt.title(f'Training Progress - {display_name}')
        plt.xlabel('Rounds')
        plt.ylabel('RMSE')
        plt.legend()
        plt.grid(True)
        
        plot_path = f"plots/{model_identifier}_loss.png"
        plt.savefig(plot_path)
        plt.close()

    elif model_type.lower() == "random_forest":
        # Extract specific params for RF
        n_estimators = int(params.get('n_estimators', 100))
        max_depth = params.get('max_depth', None) # RF default is None (infinite)
        if max_depth: max_depth = int(max_depth)

        print(f"Configuring Random Forest: Trees={n_estimators}, Depth={max_depth}...")
        
        model = RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=42
        )
        model.fit(X_train, y_train)
        
        # RF doesn't have a round-by-round loss plot by default, 
        # so we skip the plot or generate a feature importance plot instead.
        plot_path = None 

    else:
        raise ValueError(f"Unsupported model type: {model_type}")

    # --- 4. Save Model ---
    # Save standard JSON for XGBoost, could be joblib/pickle for others
    model_filename = f"models/{model_identifier}.json"
    
    if hasattr(model, 'save_model'):
        model.save_model(model_filename)
    else:
        # For non-XGB libs (like sklearn), usually use joblib
        # Here we just mock save for the example
        with open(model_filename, 'w') as f:
            f.write('{"mock": "sklearn_model_saved"}')
    
    # --- 5. Evaluate ---
    predictions = model.predict(X_test)
    r2 = r2_score(y_test, predictions)
    mse = mean_squared_error(y_test, predictions)

    return {
        "id": run_id,
        "name": display_name,
        "metrics": {
            "r2_score": round(r2, 4),
            "mse": round(mse, 4)
        },
        "config": {
            "type": model_type,
            "params": params
        },
        "files": {
            "model": model_filename,
            "plot": plot_path
        }
    }

# ==========================================
# 2. HELPER: DUMMY DATA
# ==========================================

def create_dummy_data(num_samples=1000):
    np.random.seed(42)
    actual_strength = np.random.uniform(0.5, 4.5, num_samples)
    data = {
        'density': actual_strength * 0.8 + np.random.normal(0, 0.1, num_samples),
        'moisture_content': np.random.normal(15, 2, num_samples),
        'pressure_applied': actual_strength * 2 + np.random.normal(0, 0.5, num_samples),
    }
    df = pd.DataFrame(data)
    df['shear_strength_actual'] = actual_strength
    return df

# ==========================================
# 3. USAGE EXAMPLES
# ==========================================

if __name__ == "__main__":
    # Get Data
    df = create_dummy_data(2000)

    # EXAMPLE 1: Custom XGBoost with specific hyperparams
    print("--- Test 1: Custom XGBoost ---")
    result_1 = train_custom_model(
        df, 
        model_type="xgboost",
        custom_name="Production_V1", 
        hyperparameters={
            "learning_rate": 0.01, # Slower learning
            "max_depth": 8,        # Deeper trees
            "n_estimators": 300
        }
    )
    print(f"Result 1 R2: {result_1['metrics']['r2_score']}\n")

    # EXAMPLE 2: Default Name, Default Params
    print("--- Test 2: Defaults ---")
    result_2 = train_custom_model(df, model_type="xgboost") 
    print(f"Generated Name: {result_2['name']}")
    print(f"Result 2 R2: {result_2['metrics']['r2_score']}\n")

    # EXAMPLE 3: Different Model Architecture
    print("--- Test 3: Random Forest ---")
    result_3 = train_custom_model(
        df, 
        model_type="random_forest",
        custom_name="Experiment_RF",
        hyperparameters={"n_estimators": 50}
    )
    print(f"Result 3 R2: {result_3['metrics']['r2_score']}")