import pandas as pd
import numpy as np
import os

# ==========================================
# CONFIGURATION
# ==========================================
OUTPUT_FOLDER = "training_data"
FILENAME = "grid_multiclass_data.csv"
FILE_PATH = os.path.join(OUTPUT_FOLDER, FILENAME)
SAMPLES_PER_CLASS = 3000

def generate_multiclass_data():
    np.random.seed(42)
    
    # ---------------------------------------------------------
    # SCENARIO 0: NORMAL OPERATION
    # ---------------------------------------------------------
    # Voltage stable (120V), Current stable (15A), Temp normal (40C)
    df_normal = pd.DataFrame({
        'voltage': np.random.normal(120, 2, SAMPLES_PER_CLASS),
        'current': np.random.normal(15, 2, SAMPLES_PER_CLASS),
        'temperature': np.random.normal(40, 5, SAMPLES_PER_CLASS),
        'label': 0  # <--- CLASS 0: NORMAL
    })

    # ---------------------------------------------------------
    # SCENARIO 1: FALSE DATA INJECTION (FDI)
    # ---------------------------------------------------------
    # Attackers inject massive voltage spikes to trigger emergency shutdowns.
    # Pattern: Voltage is insanely high, but Current/Temp remain normal (physically impossible)
    df_fdi = pd.DataFrame({
        'voltage': np.random.normal(150, 10, SAMPLES_PER_CLASS), # Spike!
        'current': np.random.normal(15, 2, SAMPLES_PER_CLASS),   # Normal
        'temperature': np.random.normal(40, 5, SAMPLES_PER_CLASS), # Normal
        'label': 1  # <--- CLASS 1: FDI ATTACK
    })

    # ---------------------------------------------------------
    # SCENARIO 2: DOS / OVERLOAD
    # ---------------------------------------------------------
    # Attackers flood the system, causing components to overheat and current to spike.
    # Pattern: Current is very high, Temp is rising, Voltage drops (sag).
    df_dos = pd.DataFrame({
        'voltage': np.random.normal(100, 5, SAMPLES_PER_CLASS),  # Sag
        'current': np.random.normal(40, 5, SAMPLES_PER_CLASS),   # High Load
        'temperature': np.random.normal(85, 5, SAMPLES_PER_CLASS), # Overheating
        'label': 2  # <--- CLASS 2: DOS ATTACK
    })

    # ---------------------------------------------------------
    # COMBINE AND SHUFFLE
    # ---------------------------------------------------------
    df_final = pd.concat([df_normal, df_fdi, df_dos])
    
    # Shuffle the rows so they aren't in order
    df_final = df_final.sample(frac=1).reset_index(drop=True)

    # Save
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)

    df_final.to_csv(FILE_PATH, index=False)
    
    print(f"Generated {len(df_final)} logs.")
    print("Class Distribution:")
    print(df_final['label'].value_counts())
    print(f"\nSaved to: {FILE_PATH}")

if __name__ == "__main__":
    generate_multiclass_data()