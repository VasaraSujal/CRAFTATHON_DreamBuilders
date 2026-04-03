const mongoose = require('mongoose');

const trafficLogSchema = mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
    },
    source: {
        type: String,
        required: true,
    },
    destination: {
        type: String,
        required: true,
    },
    protocol: {
        type: String,
        required: true,
    },
    packetSize: {
        type: Number,
        required: true,
    },
    duration: {
        type: Number,
        required: true,
    },
    frequency: {
        type: Number,
        default: 1,
    },
    status: {
        type: String,
        enum: ['Normal', 'Anomaly'],
        default: 'Normal',
    },
    attackType: {
        type: String,
        default: 'None',
    },
    threatCategory: {
        type: String,
        enum: ['None', 'Jamming', 'Spoofing', 'Intrusion', 'Mixed'],
        default: 'None',
    },
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Low',
    },
    modelType: {
        type: String,
        enum: ['isolation', 'randomForest'],
        default: 'isolation',
    },
    score: {
        type: Number,
        default: 0,
    },
    sourceType: {
        type: String,
        enum: ['realtime', 'simulation', 'dataset'],
        default: 'realtime',
    },
    predictionSource: {
        type: String,
        enum: ['python', 'fallback'],
        default: 'python',
    },
    datasetSource: {
        type: String,
        enum: ['RealtimeStream', 'UNSW-NB15', 'NSL-KDD', 'CICIDS', 'Simulation', 'ManualIngest'],
        default: 'RealtimeStream',
    },
    signalAvailability: {
        type: Number,
        min: 0,
        max: 100,
        default: 100,
    },
    signalIntegrity: {
        type: Number,
        min: 0,
        max: 100,
        default: 100,
    },
    jammingRisk: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
    },
    spoofingRisk: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
    },
    intrusionRisk: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
    },
    auditSignature: {
        type: String,
        default: '',
    },
});

const TrafficLog = mongoose.model('TrafficLog', trafficLogSchema);

module.exports = TrafficLog;
