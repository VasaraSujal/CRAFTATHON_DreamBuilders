const axios = require('axios');
const crypto = require('crypto');
const TrafficLog = require('../models/TrafficLog');
const Alert = require('../models/Alert');

const makeLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const makeAuditSignature = (payload) => {
    const secret = process.env.AUDIT_SECRET || process.env.JWT_SECRET || 'secure-audit-key';
    return crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const average = (items) => {
    if (!items.length) return 0;
    const total = items.reduce((sum, value) => sum + value, 0);
    return total / items.length;
};

const detectFanOutSpike = async (sourceIp) => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);

    const [lastHourDestinations, historyRows] = await Promise.all([
        TrafficLog.distinct('destination', {
            source: sourceIp,
            timestamp: { $gte: oneHourAgo },
        }),
        TrafficLog.find(
            {
                source: sourceIp,
                timestamp: { $gte: twentyFiveHoursAgo, $lt: oneHourAgo },
            },
            { destination: 1, timestamp: 1 },
        ).lean(),
    ]);

    const currentUnique = lastHourDestinations.length;

    const perHourMap = new Map();
    historyRows.forEach((row) => {
        const ts = new Date(row.timestamp);
        if (Number.isNaN(ts.getTime())) return;
        const hourBucket = `${ts.getUTCFullYear()}-${ts.getUTCMonth()}-${ts.getUTCDate()}-${ts.getUTCHours()}`;
        const bucket = perHourMap.get(hourBucket) || new Set();
        if (row.destination) bucket.add(row.destination);
        perHourMap.set(hourBucket, bucket);
    });

    const historicalHourlyUniques = [...perHourMap.values()].map((set) => set.size);
    const usualHourly = Math.max(2, Math.round(average(historicalHourlyUniques) || 2));
    const extraMessages = Math.max(0, currentUnique - usualHourly);

    const triggered = currentUnique >= 100 && extraMessages >= 98;

    return {
        triggered,
        currentUnique,
        usualHourly,
        extraMessages,
    };
};

const calculateSecuritySignals = (trafficData, status, attackType) => {
    const packetScore = clamp((trafficData.packetSize - 1000) / 30);
    const freqScore = clamp((trafficData.frequency - 20) * 2);
    const durationScore = clamp((trafficData.duration - 3) * 10);

    const jammingRisk = clamp(packetScore * 0.35 + freqScore * 0.55 + durationScore * 0.1 + (attackType === 'DDoS' ? 18 : 0));
    const spoofingRisk = clamp((trafficData.protocol === 'ICMP' ? 30 : 0) + durationScore * 0.5 + packetScore * 0.2 + (attackType === 'Spoofing' ? 28 : 0));
    const intrusionRisk = clamp(durationScore * 0.55 + packetScore * 0.2 + freqScore * 0.25 + (attackType === 'Intrusion' ? 25 : 0));

    const anomalyPenalty = status === 'Anomaly' ? 12 : 0;
    const signalAvailability = clamp(100 - (jammingRisk * 0.65 + freqScore * 0.15 + anomalyPenalty));
    const signalIntegrity = clamp(100 - (spoofingRisk * 0.55 + intrusionRisk * 0.3 + anomalyPenalty));

    let threatCategory = 'None';
    const activeThreats = [jammingRisk >= 65, spoofingRisk >= 65, intrusionRisk >= 65].filter(Boolean).length;

    if (activeThreats > 1) {
        threatCategory = 'Mixed';
    } else if (jammingRisk >= spoofingRisk && jammingRisk >= intrusionRisk && jammingRisk >= 60) {
        threatCategory = 'Jamming';
    } else if (spoofingRisk >= intrusionRisk && spoofingRisk >= 60) {
        threatCategory = 'Spoofing';
    } else if (intrusionRisk >= 60) {
        threatCategory = 'Intrusion';
    }

    return {
        signalAvailability,
        signalIntegrity,
        jammingRisk,
        spoofingRisk,
        intrusionRisk,
        threatCategory,
    };
};

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
        const securitySignals = calculateSecuritySignals(normalized, status, attackType);

        const severity = getSeverity(status, attackType);
        const datasetSource = options.datasetSource || inferDatasetSource(options.sourceType);

        const payloadForStorage = {
            ...normalized,
            status,
            attackType,
            threatCategory: securitySignals.threatCategory,
            severity,
            modelType,
            score,
            sourceType: options.sourceType || 'realtime',
            predictionSource,
            datasetSource,
            signalAvailability: securitySignals.signalAvailability,
            signalIntegrity: securitySignals.signalIntegrity,
            jammingRisk: securitySignals.jammingRisk,
            spoofingRisk: securitySignals.spoofingRisk,
            intrusionRisk: securitySignals.intrusionRisk,
        };

        payloadForStorage.auditSignature = makeAuditSignature({
            source: payloadForStorage.source,
            destination: payloadForStorage.destination,
            timestamp: new Date().toISOString(),
            status: payloadForStorage.status,
            attackType: payloadForStorage.attackType,
            threatCategory: payloadForStorage.threatCategory,
            modelType: payloadForStorage.modelType,
            signalAvailability: payloadForStorage.signalAvailability,
            signalIntegrity: payloadForStorage.signalIntegrity,
            datasetSource: payloadForStorage.datasetSource,
        });

        // Persist all metadata events for secure logging and post-operation audit.
        const log = await TrafficLog.create(payloadForStorage);

        const shouldAlert =
            status === 'Anomaly' ||
            securitySignals.jammingRisk >= 70 ||
            securitySignals.spoofingRisk >= 70 ||
            securitySignals.intrusionRisk >= 70 ||
            securitySignals.signalAvailability < 55 ||
            securitySignals.signalIntegrity < 55;

        if (shouldAlert && ['Medium', 'High', 'Critical'].includes(severity)) {
            await Alert.create({
                logId: log._id,
                message: `Alert: ${securitySignals.threatCategory !== 'None' ? securitySignals.threatCategory : attackType} risk from ${normalized.source} to ${normalized.destination}`,
                severity,
            });
        }

        const fanOut = await detectFanOutSpike(normalized.source);
        if (fanOut.triggered) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const existingSpecialAlert = await Alert.findOne({
                timestamp: { $gte: oneHourAgo },
                message: {
                    $regex: new RegExp(`Special fan-out alert for source ${escapeRegex(normalized.source)}`, 'i'),
                },
            }).lean();

            if (!existingSpecialAlert) {
                await Alert.create({
                    logId: log._id,
                    severity: 'Critical',
                    message: `Special fan-out alert for source ${normalized.source}: currently communicating with ${fanOut.currentUnique} unique destinations in the last hour. Usual hourly pattern is ${fanOut.usualHourly}. Suspicious increase of ${fanOut.extraMessages} additional communications detected.`,
                });
            }
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

const inferDatasetSource = (sourceType = '') => {
    const normalized = String(sourceType).toLowerCase();
    if (normalized.includes('unsw')) return 'UNSW-NB15';
    if (normalized.includes('nsl')) return 'NSL-KDD';
    if (normalized.includes('cic')) return 'CICIDS';
    if (normalized === 'simulation') return 'Simulation';
    if (normalized === 'dataset') return 'RealtimeStream';
    if (normalized === 'manual' || normalized === 'manualingest') return 'ManualIngest';
    return 'RealtimeStream';
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
