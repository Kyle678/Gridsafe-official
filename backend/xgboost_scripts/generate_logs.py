import pandas as pd
import numpy as np
import os
import datetime

OUTPUT_FOLDER = "datasets"

def generate_multiclass_data(total_samples=3000, attack_ratios=None):
    """
    :param total_samples: Total rows to generate (master limit)
    :param attack_ratios: Dict of ratios per attack type.
    """
    if attack_ratios is None: attack_ratios = {'fdi': 0.0, 'dos': 0.0}
    
    np.random.seed(42)
    
    # 1. Calculate specific counts based on Total Samples
    counts = {}
    total_malicious = 0
    
    for attack, ratio in attack_ratios.items():
        count = int(total_samples * ratio)
        counts[attack] = count
        total_malicious += count

    # The remainder is Normal traffic
    n_normal = total_samples - total_malicious
    if n_normal < 0:
        print("Warning: Attack percentages exceed 100%. Adjusting.")
        n_normal = 0

    print(f"--- Generating: {n_normal} Normal | Attacks: {counts} ---")

    dfs = []

    # 2. GENERATE NORMAL
    if n_normal > 0:
        df_normal = pd.DataFrame({
            'voltage': np.random.normal(120, 2, n_normal),
            'current': np.random.normal(15, 2, n_normal),
            'temperature': np.random.normal(40, 5, n_normal),
            'label': 0 
        })
        dfs.append(df_normal)

    # 3. GENERATE ATTACKS
    # FDI Attack (Label 1)
    if counts.get('fdi', 0) > 0:
        n = counts['fdi']
        df_fdi = pd.DataFrame({
            'voltage': np.random.normal(150, 10, n), 
            'current': np.random.normal(15, 2, n),   
            'temperature': np.random.normal(40, 5, n),
            'label': 1 
        })
        dfs.append(df_fdi)

    # DoS Attack (Label 2)
    if counts.get('dos', 0) > 0:
        n = counts['dos']
        df_dos = pd.DataFrame({
            'voltage': np.random.normal(100, 5, n),  
            'current': np.random.normal(40, 5, n),   
            'temperature': np.random.normal(85, 5, n), 
            'label': 2 
        })
        dfs.append(df_dos)

    # 4. COMBINE & SIMULATE TIME
    if not dfs:
        return {"error": "No data generated"}

    df_final = pd.concat(dfs)
    
    # Randomize the rows so attacks are mixed in with normal traffic
    df_final = df_final.sample(frac=1).reset_index(drop=True)

    # --- TIMESTAMP LOGIC ---
    # Start 'now' and increment by 1 second for every subsequent row
    start_time = datetime.datetime.now()
    time_deltas = pd.to_timedelta(np.arange(len(df_final)), unit='s')
    
    # Assign the timestamp column
    df_final['timestamp'] = start_time + time_deltas

    # Reorder columns: timestamp first, then features, then label
    cols = ['timestamp', 'voltage', 'current', 'temperature', 'label']
    df_final = df_final[cols]

    # 5. SAVE
    if not os.path.exists(OUTPUT_FOLDER): os.makedirs(OUTPUT_FOLDER)
    
    # Use simple timestamp for filename
    file_ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"grid_data_{file_ts}.csv"
    file_path = os.path.join(OUTPUT_FOLDER, filename)
    
    df_final.to_csv(file_path, index=False)
    
    return {
        "filename": filename,
        "total_samples": len(df_final),
        "breakdown": {
            "normal": n_normal,
            **counts
        }
    }

if __name__ == "__main__":
    result = generate_multiclass_data(
        total_samples=5000,
        attack_ratios={
            'fdi': 0.1,  # 10% FDI
            'dos': 0.15  # 15% DoS
        }
    )
    print("Data Generation Result:", result)