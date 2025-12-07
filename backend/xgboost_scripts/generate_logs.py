import pandas as pd
import numpy as np
import os
import uuid
import datetime

OUTPUT_FOLDER = "datasets"

def generate_multiclass_data(total_samples=3000, attack_ratios=None):
    """
    :param total_samples: Total rows to generate (master limit)
    :param attack_ratios: Dict of ratios per attack type, e.g. {'fdi': 0.1, 'dos': 0.2}
                          Sum of ratios should ideally be <= 1.0.
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
        # Failsafe: If percentages exceed 100%, clip normal to 0 and warn
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

    # 3. GENERATE ATTACKS (Dynamically based on dictionary keys)
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

    # 4. COMBINE & METADATA
    if not dfs:
        return {"error": "No data generated (check percentages)"}

    df_final = pd.concat(dfs)
    df_final = df_final.sample(frac=1).reset_index(drop=True)

    timestamp = datetime.datetime.now().strftime("%Y%m%d")
    unique_suffix = str(uuid.uuid4())[:4]
    dataset_id = f"Grid-Data-{timestamp}-{unique_suffix}"
    
    df_final['dataset_id'] = dataset_id
    cols = ['dataset_id'] + [col for col in df_final.columns if col != 'dataset_id']
    df_final = df_final[cols]

    # 5. SAVE
    if not os.path.exists(OUTPUT_FOLDER): os.makedirs(OUTPUT_FOLDER)
    filename = f"{dataset_id}.csv"
    file_path = os.path.join(OUTPUT_FOLDER, filename)
    df_final.to_csv(file_path, index=False)
    
    return {
        "filename": filename,
        "total_samples": len(df_final),
        "breakdown": {
            "normal": n_normal,
            **counts
        },
        "dataset_id": dataset_id
    }