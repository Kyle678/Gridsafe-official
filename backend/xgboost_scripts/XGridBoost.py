import xgboost as xgb
import pandas as pd
import numpy as np
import os
import shutil
import datetime
import uuid
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, mean_squared_error, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns

class XGridBoost:
    def __init__(self, task_type='multiclass'):
        self.task_type = task_type
        self.model = None
        self.evals_result = {}  # To store training history
        
        # Base directories
        self.base_results_dir = "test_results"
        
        # Ensure base directories exist
        os.makedirs(self.base_results_dir, exist_ok=True)

        # Default Params
        self.params = {
            'max_depth': 6,
            'eta': 0.3,
            'verbosity': 1,
            'seed': 42
        }
        
        if self.task_type == 'regression':
            self.params.update({'objective': 'reg:squarederror', 'eval_metric': 'rmse'})
        elif self.task_type == 'classification':
            self.params.update({'objective': 'binary:logistic', 'eval_metric': 'logloss'})
        elif self.task_type == 'multiclass':
            self.params.update({'objective': 'multi:softmax', 'eval_metric': 'mlogloss'})

    def load_data(self, filepath, label_col):
        if not filepath.endswith('.csv'):
            raise ValueError("File must be a .csv")
        
        print(f"Loading data from {filepath}...")
        df = pd.read_csv(filepath)
        
        if label_col not in df.columns:
            raise ValueError(f"Label column '{label_col}' not found.")

        X = df.drop(columns=[label_col])
        y = df[label_col]
        return X, y

    def train(self, X, y, test_size=0.2, num_boost_round=100):
        """
        Trains model, generates unique ID, creates folder, saves plots/reports, 
        and updates 'latest' folder.
        """
        # 1. Generate Unique ID for this run
        run_id = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        run_folder = os.path.join(self.base_results_dir, f"run_{run_id}")
        os.makedirs(run_folder, exist_ok=True)
        
        print(f"--- Starting Run: {run_id} ---")

        # 2. Prepare Data
        if self.task_type == 'multiclass':
            self.params['num_class'] = y.nunique()

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
        dtrain = xgb.DMatrix(X_train, label=y_train)
        dtest = xgb.DMatrix(X_test, label=y_test)

        # 3. Train with history monitoring
        evals = [(dtrain, 'train'), (dtest, 'eval')]
        self.model = xgb.train(
            self.params, 
            dtrain, 
            num_boost_round=num_boost_round, 
            evals=evals,
            early_stopping_rounds=10,
            verbose_eval=False,
            evals_result=self.evals_result # Capture history
        )
        
        # 4. Generate Outputs inside the unique folder
        self._save_report(X_test, y_test, run_folder)
        self._save_training_plot(run_folder)
        self._save_model_file(run_folder, run_id)
        
        # 5. Update "Latest" Folder
        self._update_latest_folder(run_folder)
        
        print(f"Run {run_id} complete. Results saved to {run_folder}")

    def predict(self, X):
        if self.model is None:
            raise Exception("Model not trained.")
        dinput = xgb.DMatrix(X)
        preds = self.model.predict(dinput)
        
        if self.task_type == 'classification':
            return [1 if p > 0.5 else 0 for p in preds]
        return preds

    def _save_report(self, X, y, folder_path):
        """Internal: Generates text report."""
        preds = self.predict(X)
        report_path = os.path.join(folder_path, "evaluation_report.txt")
        
        lines = [f"Evaluation Report", "-"*20]
        
        if self.task_type in ['classification', 'multiclass']:
            acc = accuracy_score(y, preds)
            lines.append(f"Accuracy: {acc:.4f}")
            lines.append("\nClassification Report:")
            lines.append(classification_report(y, preds))
            
            # Save Confusion Matrix Plot
            self._save_confusion_matrix(y, preds, folder_path)
        else:
            rmse = np.sqrt(mean_squared_error(y, preds))
            lines.append(f"RMSE: {rmse:.4f}")

        with open(report_path, "w") as f:
            f.write("\n".join(lines))

    def _save_training_plot(self, folder_path):
        """Internal: Plots the loss curve over iterations."""
        results = self.evals_result
        epochs = len(results['train'][list(results['train'].keys())[0]])
        x_axis = range(0, epochs)
        
        fig, ax = plt.subplots()
        ax.plot(x_axis, results['train'][list(results['train'].keys())[0]], label='Train')
        ax.plot(x_axis, results['eval'][list(results['eval'].keys())[0]], label='Test')
        ax.legend()
        plt.ylabel('Loss')
        plt.title('XGBoost Training Loss')
        
        plt.savefig(os.path.join(folder_path, "training_loss_curve.png"))
        plt.close()

    def _save_confusion_matrix(self, y_true, y_pred, folder_path):
        """Internal: Generates a heatmap for multiclass results."""
        cm = confusion_matrix(y_true, y_pred)
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
        plt.title('Confusion Matrix')
        plt.ylabel('Actual')
        plt.xlabel('Predicted')
        plt.savefig(os.path.join(folder_path, "confusion_matrix.png"))
        plt.close()

    def _save_model_file(self, folder_path, run_id):
        """Internal: Saves the .json model inside the run folder."""
        model_name = f"model_{run_id}.json"
        self.model.save_model(os.path.join(folder_path, model_name))

    def _update_latest_folder(self, source_folder):
        """Internal: Copies contents of source_folder to 'test_results/latest'."""
        latest_dir = os.path.join(self.base_results_dir, "latest")
        
        # Remove existing 'latest' if it exists
        if os.path.exists(latest_dir):
            shutil.rmtree(latest_dir)
        
        # Copy new run to 'latest'
        shutil.copytree(source_folder, latest_dir)

    def load(self, filepath):
        """Loads a specific model file."""
        self.model = xgb.Booster()
        self.model.load_model(filepath)
        print(f"Model loaded from {filepath}")