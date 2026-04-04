const mongoose = require('mongoose');

const auditLogSchema = mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    actorName: {
        type: String,
        default: '',
    },
    actorRole: {
        type: String,
        default: '',
    },
    action: {
        type: String,
        required: true,
    },
    targetType: {
        type: String,
        default: '',
    },
    targetId: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['success', 'failure'],
        default: 'success',
    },
    details: {
        type: Object,
        default: {},
    },
    ipAddress: {
        type: String,
        default: '',
    },
    userAgent: {
        type: String,
        default: '',
    },
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;