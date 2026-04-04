const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['Admin', 'Analyst', 'Monitor'],
        default: 'Monitor',
        validate: {
            validator: function(v) {
                return ['Admin', 'Analyst', 'Monitor'].includes(v);
            },
            message: 'Invalid role. Must be Admin, Analyst, or Monitor.'
        }
    },
    accountStatus: {
        type: String,
        enum: ['pending', 'active', 'rejected'],
        default: 'pending',
        index: true,
    },
    approvedAt: {
        type: Date,
        default: null,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    mfaEnabled: {
        type: Boolean,
        default: false,
    },
    mfaSecret: {
        type: String,
        default: '',
        select: false,
    },
    mfaTempSecret: {
        type: String,
        default: '',
        select: false,
    },
    mfaLastUsedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

module.exports = User;
