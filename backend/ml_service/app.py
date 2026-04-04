import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.ensemble import RandomForestClassifier
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import os

app = Flask(__name__)
CORS(app)

ISOLATION_MODEL_PATH = 'isolation_model.pkl'
RF_MODEL_PATH = 'rf_model.pkl'
LEGACY_MODEL_PATH = 'model.pkl'

def load_isolation_model():
    if os.path.exists(ISOLATION_MODEL_PATH):
        print(f"Loading pre-trained model from {ISOLATION_MODEL_PATH}...")
        return joblib.load(ISOLATION_MODEL_PATH)
    if os.path.exists(LEGACY_MODEL_PATH):
        print(f"Loading pre-trained legacy model from {LEGACY_MODEL_PATH}...")
        return joblib.load(LEGACY_MODEL_PATH)

    print("WARNING: Isolation model not found. Using a randomized fallback model.")
    fallback = IsolationForest(contamination=0.1, random_state=42)
    x_train_dummy = np.random.rand(200, 4)
    fallback.fit(x_train_dummy)
    return fallback


def load_random_forest_model():
    if os.path.exists(RF_MODEL_PATH):
        print(f"Loading pre-trained model from {RF_MODEL_PATH}...")
        return joblib.load(RF_MODEL_PATH)

    print("WARNING: RF model not found. Using a lightweight fallback classifier.")
    x_train_dummy = np.random.rand(300, 4)
    y_train_dummy = (x_train_dummy[:, 0] > 0.75).astype(int)
    fallback = RandomForestClassifier(n_estimators=50, random_state=42)
    fallback.fit(x_train_dummy, y_train_dummy)
    return fallback


isolation_model = load_isolation_model()
rf_model = load_random_forest_model()


def build_features(data):
    protocol_map = {"TCP": 0, "UDP": 1, "ICMP": 2, "OTHER": 3}
    protocol = str(data.get('protocol', 'OTHER')).upper()
    protocol_val = protocol_map.get(protocol, 3)

    return np.array([[
        float(data.get('packetSize', 0)),
        float(data.get('duration', 0)),
        float(data.get('frequency', 1)),
        protocol_val
    ]])


def infer_attack_type(result, data):
    if result == "Normal":
        return "None"

    if float(data.get('packetSize', 0)) > 1500 and float(data.get('frequency', 0)) > 40:
        return "DDoS"
    if float(data.get('duration', 0)) > 5.0:
        return "Intrusion"
    return "Spoofing"

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        features = build_features(data)
        model_type = str(data.get('modelType', 'isolation'))

        if model_type == 'randomForest':
            prediction = rf_model.predict(features)
            probability = rf_model.predict_proba(features)[0][1]
            result = "Anomaly" if int(prediction[0]) == 1 else "Normal"
            score = float(probability)
        else:
            prediction = isolation_model.predict(features)
            result = "Normal" if prediction[0] == 1 else "Anomaly"
            score = float(isolation_model.decision_function(features)[0])

        attack_type = infer_attack_type(result, data)
        
        return jsonify({
            "status": result,
            "attackType": attack_type,
            "score": score,
            "modelType": model_type,
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

import os

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    app.run(host="0.0.0.0", port=port)