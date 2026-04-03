const axios = require('axios');
const TrafficLog = require('../models/TrafficLog');
const Alert = require('../models/Alert');

const makeLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Simulate real-time monitoring and detection
const processTraffic = async (trafficData, options = {}) => {
    try {
        const normalized = normalizeTraffic(trafficData);
        const modelType = options.modelType || 'isolation';
        let prediction = null;
        let score = 0;
        let predictionSource = 'python';

        // 1. Send data to Python ML API for prediction
        try {
            const response = await axios.post(`${process.env.PYTHON_API_URL}/predict`, {
                packetSize: normalized.packetSize,
                duration: normalized.duration,
                frequency: normalized.frequency,
                protocol: normalized.protocol,
                modelType
            });

            prediction = response.data;
            score = response.data.score || 0;
        } catch (mlError) {
            console.warn('Python ML service unavailable, using local fallback:', mlError.message);
            predictionSource = 'fallback';
            prediction = localPredict(normalized, modelType);
            score = prediction.score;
        }

        const { status, attackType } = prediction;

        const severity = getSeverity(status, attackType);
        const shouldPersist = status === 'Anomaly';

        // 2. Save only anomalous traffic to MongoDB; normal traffic remains local only.
        const log = shouldPersist
            ? await TrafficLog.create({
                ...normalized,
                status,
                attackType,
                severity,
                modelType,
                score,
                sourceType: options.sourceType || 'realtime',
                predictionSource,
            })
            : {
                _id: makeLocalId(),
                ...normalized,
                status,
                attackType,
                severity,
                modelType,
                score,
                sourceType: options.sourceType || 'realtime',
                predictionSource,
                persisted: false,
                timestamp: new Date().toISOString(),
            };

        // 3. Generate alert only for Medium/High/Critical anomalies
        if (status === 'Anomaly' && ['Medium', 'High', 'Critical'].includes(severity)) {
            await Alert.create({
                logId: log._id,
                message: `Alert: ${attackType} detected from ${normalized.source} to ${normalized.destination}`,
                severity,
            });
        }

        return log;
    } catch (error) {
        console.error('Error processing traffic:', error.message);
        throw error;
    }
};

const getSeverity = (status, attackType) => {
    if (status === 'Normal') return 'Low';
    if (attackType === 'DDoS') return 'Critical';
    if (attackType === 'Intrusion') return 'High';
    return 'Medium';
};

const normalizeTraffic = (trafficData) => {
    const protocol = String(trafficData.protocol || 'Other').toUpperCase();
    return {
        source: String(trafficData.source || '0.0.0.0'),
        destination: String(trafficData.destination || '0.0.0.0'),
        protocol,
        packetSize: Number(trafficData.packetSize || 0),
        duration: Number(trafficData.duration || 0),
        frequency: Number(trafficData.frequency || 1),
    };
};

const localPredict = (trafficData, modelType) => {
    const isSuspicious =
        trafficData.packetSize > 1500 ||
        trafficData.frequency > 40 ||
        trafficData.duration > 5;

    if (modelType === 'randomForest') {
        const result = isSuspicious ? 'Anomaly' : 'Normal';
        return {
            status: result,
            attackType: inferLocalAttackType(trafficData, result),
            score: isSuspicious ? 0.88 : 0.12,
        };
    }

    return {
        status: isSuspicious ? 'Anomaly' : 'Normal',
        attackType: inferLocalAttackType(trafficData, isSuspicious ? 'Anomaly' : 'Normal'),
        score: isSuspicious ? -0.75 : 0.75,
    };
};

const inferLocalAttackType = (trafficData, status) => {
    if (status === 'Normal') return 'None';
    if (trafficData.packetSize > 1500 && trafficData.frequency > 40) return 'DDoS';
    if (trafficData.duration > 5) return 'Intrusion';
    return 'Spoofing';
};

module.exports = { processTraffic };
