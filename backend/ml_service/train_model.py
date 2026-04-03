import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.ensemble import RandomForestClassifier

FEATURE_COLUMNS = ['packetSize', 'duration', 'frequency', 'protocol']


def generate_mock_dataset(rows=1400):
    print('Generating mock dataset (similar to UNSW-NB15/NSL-KDD/CICIDS features)...')
    np.random.seed(42)
    normal_size = int(rows * 0.88)
    attack_size = rows - normal_size

    normal_data = pd.DataFrame(
        {
            'packetSize': np.random.normal(500, 100, normal_size),
            'duration': np.random.exponential(1, normal_size),
            'frequency': np.random.poisson(10, normal_size),
            'protocol': np.random.choice([0, 1, 2], normal_size, p=[0.7, 0.2, 0.1]),
            'label': 0,
        }
    )

    attack_data = pd.DataFrame(
        {
            'packetSize': np.random.normal(3000, 500, attack_size),
            'duration': np.random.exponential(10, attack_size),
            'frequency': np.random.poisson(100, attack_size),
            'protocol': np.random.choice([0, 1, 2], attack_size),
            'label': 1,
        }
    )

    return pd.concat([normal_data, attack_data], ignore_index=True)


def preprocess_dataset(dataset):
    protocol_map = {'TCP': 0, 'UDP': 1, 'ICMP': 2, 'OTHER': 3}

    rename_map = {
        'packet_size': 'packetSize',
        'pkt_size': 'packetSize',
        'src_bytes': 'packetSize',
        'dst_bytes': 'packetSize',
        'flow_duration': 'duration',
        'flow_duration_ms': 'duration',
        'dur': 'duration',
        'freq': 'frequency',
        'tot_fwd_pkts': 'frequency',
        'tot_bwd_pkts': 'frequency',
        'flow_pkts_s': 'frequency',
        'flow_packets/s': 'frequency',
        'proto': 'protocol',
        'protocol_type': 'protocol',
    }
    dataset = dataset.rename(columns=rename_map)

    if 'protocol' not in dataset.columns:
        dataset['protocol'] = 'OTHER'

    if dataset['protocol'].dtype == object:
        dataset['protocol'] = (
            dataset['protocol'].fillna('OTHER').astype(str).str.upper().map(protocol_map).fillna(3)
        )

    label_candidates = ['label', 'Label', 'class', 'Class', 'attack_cat', 'attack', 'outcome']
    selected_label = next((col for col in label_candidates if col in dataset.columns), None)

    if selected_label and selected_label != 'label':
        dataset['label'] = dataset[selected_label]

    if 'label' not in dataset.columns:
        dataset['label'] = 0

    if dataset['label'].dtype == object:
        normalized_label = dataset['label'].fillna('').astype(str).str.lower()
        normal_tokens = {'normal', 'benign', '0', 'false', 'none'}
        dataset['label'] = (~normalized_label.isin(normal_tokens)).astype(int)

    for col in FEATURE_COLUMNS:
        if col not in dataset.columns:
            dataset[col] = 0
        dataset[col] = pd.to_numeric(dataset[col], errors='coerce').fillna(0)

    dataset['label'] = pd.to_numeric(dataset['label'], errors='coerce').fillna(0)
    dataset['label'] = (dataset['label'] > 0).astype(int)

    return dataset


def parse_env_paths(value):
    if not value:
        return []
    return [path.strip() for path in str(value).split(',') if path.strip()]


def collect_dataset_paths():
    dataset_paths = []

    dataset_paths.extend(parse_env_paths(os.getenv('DATASET_PATHS', '')))
    dataset_paths.extend(parse_env_paths(os.getenv('UNSW_NB15_PATH', '')))
    dataset_paths.extend(parse_env_paths(os.getenv('NSL_KDD_PATH', '')))
    dataset_paths.extend(parse_env_paths(os.getenv('CICIDS_PATH', '')))

    default_dataset_dir = Path(__file__).resolve().parent / 'datasets'
    if default_dataset_dir.exists():
        dataset_paths.extend([str(path) for path in default_dataset_dir.rglob('*.csv')])

    unique_paths = []
    seen = set()
    for path in dataset_paths:
        absolute_path = os.path.abspath(path)
        if absolute_path in seen:
            continue
        seen.add(absolute_path)
        unique_paths.append(path)

    return unique_paths


def load_dataset():
    dataset_paths = collect_dataset_paths()
    if not dataset_paths:
        print('No UNSW-NB15 / NSL-KDD / CICIDS files found. Using generated fallback dataset.')
        return preprocess_dataset(generate_mock_dataset())

    frames = []
    for csv_path in dataset_paths:
        if not os.path.exists(csv_path):
            print(f'Skipping missing dataset path: {csv_path}')
            continue

        print(f'Loading dataset: {csv_path}')
        try:
            frames.append(pd.read_csv(csv_path))
        except Exception as exc:
            print(f'Skipping unreadable dataset path {csv_path}: {exc}')

    if not frames:
        print('No readable datasets found. Using generated fallback dataset.')
        return preprocess_dataset(generate_mock_dataset())

    merged = pd.concat(frames, ignore_index=True)
    return preprocess_dataset(merged)


def train():
    dataset = load_dataset()
    features = dataset[FEATURE_COLUMNS]
    labels = dataset['label']

    print(f'Training rows: {len(dataset)} | features: {FEATURE_COLUMNS}')

    print('Training Isolation Forest model...')
    isolation_model = IsolationForest(contamination=0.12, random_state=42)
    isolation_model.fit(features)

    print('Training Random Forest classifier...')
    rf_model = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
    rf_model.fit(features, labels)

    print('Saving trained models...')
    joblib.dump(isolation_model, 'isolation_model.pkl')
    joblib.dump(rf_model, 'rf_model.pkl')
    joblib.dump(isolation_model, 'model.pkl')
    print('Model artifacts: isolation_model.pkl, rf_model.pkl, model.pkl')
    print('Models trained and saved successfully.')


if __name__ == '__main__':
    train()
