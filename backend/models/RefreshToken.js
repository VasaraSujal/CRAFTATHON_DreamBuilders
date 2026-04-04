const mongoose = require('mongoose');

const refreshTokenSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    jti: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    tokenHash: {
        type: String,
        required: true,
    },
    revokedAt: {
        type: Date,
        default: null,
    },
    replacedByJti: {
        type: String,
        default: '',
    },
    createdByIp: {
        type: String,
        default: '',
    },
    userAgent: {
        type: String,
        default: '',
    },
    expiresAt: {
        type: Date,
        required: true,
    },
}, {
    timestamps: true,
});

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;