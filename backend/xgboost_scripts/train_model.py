import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
import matplotlib.pyplot as plt
import seaborn as sns # Optional, for a nicer confusion matrix if you have it
import os
import json
from datetime import datetime

# ==========================================
# CONFIGURATION
# ==========================================
DATA_FILE = "training_data/grid_multiclass_data.csv"
MODEL_DIR = "models"
PLOT_DIR = "plots"

def train_multiclass_model():
    # Setup IDs
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_identifier = f"multiclass_model_{run_id}"
    
    # Create Dirs
    os.makedirs(MODEL_DIR, exist_ok=True)
    os.makedirs(PLOT_DIR, exist_ok=True)

    # ------------------------------------------
    # 1. LOAD DATA
    # ------------------------------------------
    if not os.path.exists(DATA_FILE):
        print(f"Error: {DATA_FILE} not found. Run generate_multiclass_data.py first.")
        return

    print(f"Loading data from {DATA_FILE}...")
    df = pd.read_csv(DATA_FILE)

    # Target is 'label' (0, 1, 2)
    X = df.drop(columns=['label'])
    y = df['label']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # ------------------------------------------
    # 2. CONFIGURE MULTICLASS XGBOOST
    # ------------------------------------------
    print("Configuring Multiclass XGBoost...")
    
    # We use 'multi:softprob' so the model outputs probabilities for each class
    # num_class=3 is MANDATORY for multiclass
    model = xgb.XGBClassifier(
        objective='multi:softprob', 
        num_class=3,                
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        eval_metric='mlogloss',     # Multiclass Log Loss
        use_label_encoder=False
    )

    # ------------------------------------------
    # 3. TRAIN
    # ------------------------------------------
    print("Training...")
    model.fit(
        X_train, y_train,
        eval_set=[(X_train, y_train), (X_test, y_test)],
        verbose=False
    )

    # ------------------------------------------
    # 4. PLOT LOSS HISTORY
    # ------------------------------------------
    evals_result = model.evals_result()
    epochs = len(evals_result['validation_0']['mlogloss'])
    x_axis = range(0, epochs)
    
    plt.figure(figsize=(10, 6))
    plt.plot(x_axis, evals_result['validation_0']['mlogloss'], label='Train Loss')
    plt.plot(x_axis, evals_result['validation_1']['mlogloss'], label='Test Loss')
    plt.title('Multiclass Training Loss (mlogloss)')
    plt.xlabel('Rounds')
    plt.ylabel('Loss')
    plt.legend()
    plt.grid(True)
    
    plot_filename = f"{PLOT_DIR}/{model_identifier}_loss.png"
    plt.savefig(plot_filename)
    plt.close()
    print(f"Loss plot saved to: {plot_filename}")

    # ------------------------------------------
    # 5. EVALUATE & CONFUSION MATRIX
    # ------------------------------------------
    predictions = model.predict(X_test)
    acc = accuracy_score(y_test, predictions)
    
    print(f"\nModel Accuracy: {acc * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, predictions, target_names=['Normal', 'FDI', 'DoS']))

    # Generate Confusion Matrix
    cm = confusion_matrix(y_test, predictions)
    print("\nConfusion Matrix (Rows=Actual, Cols=Predicted):")
    print(cm)
    
    # Save Confusion Matrix as Image
    plt.figure(figsize=(8, 6))
    # Try to use seaborn for a heatmap, fallback to basic matplotlib if missing
    try:
        import seaborn as sns
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                    xticklabels=['Normal', 'FDI', 'DoS'], 
                    yticklabels=['Normal', 'FDI', 'DoS'])
        plt.ylabel('Actual')
        plt.xlabel('Predicted')
        plt.title('Confusion Matrix')
    except ImportError:
        plt.imshow(cm, cmap='Blues')
        plt.title("Confusion Matrix (Install seaborn for better viz)")
        plt.colorbar()

    cm_filename = f"{PLOT_DIR}/{model_identifier}_cm.png"
    plt.savefig(cm_filename)
    plt.close()
    print(f"Confusion Matrix saved to: {cm_filename}")

    # ------------------------------------------
    # 6. SAVE MODEL
    # ------------------------------------------
    model_filename = f"{MODEL_DIR}/{model_identifier}.json"
    model.save_model(model_filename)
    print(f"Model saved to: {model_filename}")

if __name__ == "__main__":
    train_multiclass_model()