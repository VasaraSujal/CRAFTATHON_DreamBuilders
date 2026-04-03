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
});

const TrafficLog = mongoose.model('TrafficLog', trafficLogSchema);

module.exports = TrafficLog;
