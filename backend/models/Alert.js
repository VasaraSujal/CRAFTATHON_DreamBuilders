const mongoose = require('mongoose');

const alertSchema = mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
    },
    logId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TrafficLog',
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        required: true,
    },
    resolved: {
        type: Boolean,
        default: false,
    },
});

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
