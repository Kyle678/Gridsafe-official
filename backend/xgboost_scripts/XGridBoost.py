import xgboost as xgb
import pandas as pd
import numpy as np
import os
import shutil
import datetime
import joblib 
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, mean_squared_error, confusion_matrix
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

class XGridBoost:
    def __init__(self, model_type='xgboost', task_type='multiclass'):
        self.model_type = model_type
        self.task_type = task_type
        self.model = None
        self.evals_result = {}
        
        self.base_results_dir = "test_results"
        os.makedirs(self.base_results_dir, exist_ok=True)

    def load_data(self, filepath, label_col):
        if not filepath.endswith('.csv'): 
            raise ValueError("File must be a .csv")
            
        df = pd.read_csv(filepath)
        
        # --- FIX: Drop metadata columns ---
        ignore_cols = ['dataset_id', 'log_id', 'timestamp'] 
        
        # This list comprehension ensures we don't crash if one of these is missing
        df = df.drop(columns=[c for c in ignore_cols if c in df.columns])
        
        # Verify label exists
        if label_col not in df.columns:
            raise ValueError(f"Label column '{label_col}' not found.")

        # X is everything remaining except the label
        X = df.drop(columns=[label_col])
        y = df[label_col]
        
        return X, y
    
    def train(self, X, y, test_size=0.2, params=None):
        if params is None: params = {}
        
        # 1. Setup Run
        run_id = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        run_folder = os.path.join(self.base_results_dir, f"run_{run_id}")
        os.makedirs(run_folder, exist_ok=True)
        print(f"--- Starting Run: {run_id} ({self.model_type}) ---")

        # 2. Split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)

        # 3. Train based on Type
        if self.model_type == 'xgboost':
            self._train_xgboost(X_train, y_train, X_test, y_test, y, params)
        elif self.model_type == 'random_forest':
            self._train_rf(X_train, y_train, params)
        elif self.model_type == 'linear':
            self._train_linear(X_train, y_train, params)
        
        # 4. Save Artifacts
        self._save_report(X_test, y_test, run_folder)
        if self.model_type == 'xgboost':
            self._save_training_plot(run_folder)
        self._save_model_file(run_folder, run_id)
        self._update_latest_folder(run_folder)
        
        print(f"Run complete. Results saved to {run_folder}/")

    def evaluate_saved_model(self, model_path, data_path, label_col):
        """
        Loads a model from disk, tests it on data_path, and saves results to 'latest_test'.
        """
        # 1. Load Data
        X, y = self.load_data(data_path, label_col)
        
        # 2. Load Model
        self.load_model(model_path)
        
        # 3. Create Output Folder
        test_run_dir = os.path.join(self.base_results_dir, "latest_test")
        if os.path.exists(test_run_dir): shutil.rmtree(test_run_dir)
        os.makedirs(test_run_dir, exist_ok=True)
        
        print(f"--- Evaluating Saved Model: {os.path.basename(model_path)} ---")
        
        # 4. Generate Reports
        self._save_report(X, y, test_run_dir)
        
        print(f"Test complete. Results saved to {test_run_dir}")

    def _train_xgboost(self, X_train, y_train, X_test, y_test, y_full, custom_params):
        xgb_params = {
            'max_depth': 6, 
            'eta': 0.3, 
            'verbosity': 0, 
            'seed': 42
        }
        
        num_rounds = custom_params.pop('num_boost_round', 100)
        xgb_params.update(custom_params)

        if self.task_type == 'regression':
            xgb_params.update({'objective': 'reg:squarederror', 'eval_metric': 'rmse'})
        elif self.task_type == 'classification':
            xgb_params.update({'objective': 'binary:logistic', 'eval_metric': 'logloss'})
        elif self.task_type == 'multiclass':
            xgb_params.update({'objective': 'multi:softmax', 'eval_metric': 'mlogloss', 'num_class': y_full.nunique()})

        dtrain = xgb.DMatrix(X_train, label=y_train)
        dtest = xgb.DMatrix(X_test, label=y_test)
        
        self.model = xgb.train(
            xgb_params, dtrain, num_boost_round=num_rounds,
            evals=[(dtrain, 'train'), (dtest, 'eval')],
            early_stopping_rounds=10, verbose_eval=False,
            evals_result=self.evals_result
        )

    def _train_rf(self, X_train, y_train, custom_params):
        print("Training Random Forest...")
        rf_params = {'n_estimators': 100, 'random_state': 42, 'max_depth': None}
        rf_params.update(custom_params)

        if self.task_type == 'regression':
            self.model = RandomForestRegressor(**rf_params)
        else:
            self.model = RandomForestClassifier(**rf_params)
        self.model.fit(X_train, y_train)

    def _train_linear(self, X_train, y_train, custom_params):
        print("Training Linear Model...")
        lr_params = {'max_iter': 1000}
        lr_params.update(custom_params)
        
        if self.task_type == 'regression':
            self.model = LinearRegression(**custom_params)
        else:
            log_params = {'solver': 'lbfgs', 'multi_class': 'auto', 'max_iter': 1000, 'C': 1.0}
            log_params.update(custom_params)
            self.model = LogisticRegression(**log_params)
        self.model.fit(X_train, y_train)

    def predict(self, X):
        if self.model is None: raise Exception("Model not trained.")
        if self.model_type == 'xgboost':
            dinput = xgb.DMatrix(X)
            preds = self.model.predict(dinput)
            if self.task_type == 'classification':
                return [1 if p > 0.5 else 0 for p in preds]
            return preds
        else:
            return self.model.predict(X)

    def load_model(self, filepath):
        if filepath.endswith('.json'):
            self.model = xgb.Booster()
            self.model.load_model(filepath)
            self.model_type = 'xgboost'
        else:
            self.model = joblib.load(filepath)
            name = type(self.model).__name__
            if 'RandomForest' in name: self.model_type = 'random_forest'
            elif 'Regression' in name: self.model_type = 'linear'
        print(f"Model loaded from {filepath} (Type: {self.model_type})")

    # --- Helpers (Now properly indented) ---
    def _save_report(self, X, y, folder_path):
        preds = self.predict(X)
        report_path = os.path.join(folder_path, "evaluation_report.txt")
        
        lines = [f"Model: {self.model_type}", f"Task: {self.task_type}", "-"*20]
        
        # --- CLASSIFICATION REPORTING ---
        if self.task_type in ['classification', 'multiclass']:
            acc = accuracy_score(y, preds)
            lines.append(f"Accuracy: {acc:.4f}")
            lines.append("\nClassification Report:")
            lines.append(classification_report(y, preds))
            
            self._save_confusion_matrix(y, preds, folder_path)
            self._save_feature_importance(X, folder_path)

        # --- REGRESSION REPORTING ---
        else:
            rmse = np.sqrt(mean_squared_error(y, preds))
            lines.append(f"RMSE: {rmse:.4f}")
            
            self._save_regression_scatter(y, preds, folder_path)
            self._save_feature_importance(X, folder_path)

        with open(report_path, "w") as f:
            f.write("\n".join(lines))

    def _save_confusion_matrix(self, y_true, y_pred, folder_path):
        cm = confusion_matrix(y_true, y_pred)
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
        plt.title(f'Confusion Matrix ({self.model_type})')
        plt.ylabel('Actual')
        plt.xlabel('Predicted')
        plt.savefig(os.path.join(folder_path, "confusion_matrix.png"))
        plt.close()

    def _save_training_plot(self, folder_path):
        results = self.evals_result
        if not results: return
        epochs = len(results['train'][list(results['train'].keys())[0]])
        x_axis = range(0, epochs)
        fig, ax = plt.subplots()
        ax.plot(x_axis, results['train'][list(results['train'].keys())[0]], label='Train')
        ax.plot(x_axis, results['eval'][list(results['eval'].keys())[0]], label='Test')
        ax.legend()
        plt.title('Training Loss')
        plt.savefig(os.path.join(folder_path, "training_loss_curve.png"))
        plt.close()

    def _save_model_file(self, folder_path, run_id):
        if self.model_type == 'xgboost':
            self.model.save_model(os.path.join(folder_path, f"model_{run_id}.json"))
        else:
            joblib.dump(self.model, os.path.join(folder_path, f"model_{run_id}.pkl"))

    def _update_latest_folder(self, source_folder):
        latest_dir = os.path.join(self.base_results_dir, "latest")
        if os.path.exists(latest_dir): shutil.rmtree(latest_dir)
        shutil.copytree(source_folder, latest_dir)

    def _save_feature_importance(self, X, folder_path):
        try:
            plt.figure(figsize=(10, 6))
            
            if self.model_type == 'xgboost':
                xgb.plot_importance(self.model, max_num_features=10, height=0.5)
                plt.title("XGBoost Feature Importance")
            
            elif self.model_type == 'random_forest':
                importances = self.model.feature_importances_
                indices = np.argsort(importances)[::-1][:10]
                plt.barh(range(len(indices)), importances[indices], align='center')
                plt.yticks(range(len(indices)), [X.columns[i] for i in indices])
                plt.xlabel("Relative Importance")
                plt.title("Random Forest Feature Importance")
                plt.gca().invert_yaxis()

            elif self.model_type == 'linear':
                if hasattr(self.model, 'coef_'):
                    coefs = self.model.coef_
                    if coefs.ndim > 1: coefs = coefs[0]
                    indices = np.argsort(np.abs(coefs))[::-1][:10]
                    plt.barh(range(len(indices)), coefs[indices], align='center')
                    plt.yticks(range(len(indices)), [X.columns[i] for i in indices])
                    plt.title("Linear Model Coefficients (Top 10)")
                    plt.gca().invert_yaxis()

            plt.tight_layout()
            plt.savefig(os.path.join(folder_path, "feature_importance.png"))
            plt.close()
        except Exception as e:
            print(f"Could not save feature importance: {e}")

    def _save_regression_scatter(self, y_true, y_pred, folder_path):
        plt.figure(figsize=(8, 8))
        plt.scatter(y_true, y_pred, alpha=0.5)
        min_val = min(min(y_true), min(y_pred))
        max_val = max(max(y_true), max(y_pred))
        plt.plot([min_val, max_val], [min_val, max_val], color='red', linestyle='--')
        plt.xlabel('Actual Values')
        plt.ylabel('Predicted Values')
        plt.title('Actual vs Predicted')
        plt.grid(True)
        plt.savefig(os.path.join(folder_path, "regression_scatter.png"))
        plt.close()