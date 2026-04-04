const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const RefreshToken = require('../models/RefreshToken');

const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const COOKIE_NAME = 'refreshToken';

const getAccessSecret = () => process.env.JWT_SECRET || 'supersecretkey';
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || getAccessSecret();

const getCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/api/users',
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createAccessToken = (user) => jwt.sign(
    { id: user._id.toString(), role: user.role, tokenType: 'access' },
    getAccessSecret(),
    { expiresIn: ACCESS_EXPIRES_IN },
);

const parseExpiryToSeconds = (value) => {
    const match = String(value).trim().match(/^(\d+)([smhd])$/i);
    if (!match) {
        return 30 * 24 * 60 * 60;
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return amount * (multipliers[unit] || 86400);
};

const createRefreshToken = async (user, req = {}) => {
    const jti = crypto.randomUUID();
    const token = jwt.sign(
        { id: user._id.toString(), role: user.role, jti, tokenType: 'refresh' },
        getRefreshSecret(),
        { expiresIn: REFRESH_EXPIRES_IN },
    );

    const expiresAt = new Date(Date.now() + parseExpiryToSeconds(REFRESH_EXPIRES_IN) * 1000);
    await RefreshToken.create({
        user: user._id,
        jti,
        tokenHash: hashToken(token),
        expiresAt,
        createdByIp: req.ip || req.headers?.['x-forwarded-for'] || '',
        userAgent: req.headers?.['user-agent'] || '',
    });

    return token;
};

const issueSession = async (user, req = {}) => {
    const token = createAccessToken(user);
    const refreshToken = await createRefreshToken(user, req);
    return { token, refreshToken };
};

const setRefreshCookie = (res, refreshToken) => {
    res.cookie(COOKIE_NAME, refreshToken, getCookieOptions());
};

const clearRefreshCookie = (res) => {
    res.clearCookie(COOKIE_NAME, getCookieOptions());
};

const verifyRefreshTokenRecord = async (refreshToken) => {
    const decoded = jwt.verify(refreshToken, getRefreshSecret());
    if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid refresh token');
    }

    const record = await RefreshToken.findOne({ jti: decoded.jti });
    if (!record || record.revokedAt) {
        throw new Error('Refresh token revoked or missing');
    }

    if (record.tokenHash !== hashToken(refreshToken)) {
        throw new Error('Refresh token mismatch detected');
    }

    return { decoded, record };
};

const rotateRefreshToken = async (refreshToken, req = {}) => {
    const { decoded, record } = await verifyRefreshTokenRecord(refreshToken);
    record.revokedAt = new Date();
    const userModel = require('../models/User');
    const user = await userModel.findById(decoded.id);
    if (!user) {
        throw new Error('User not found for refresh token');
    }

    const nextRefreshToken = await createRefreshToken(user, req);
    const nextDecoded = jwt.decode(nextRefreshToken);
    record.replacedByJti = nextDecoded.jti;
    await record.save();

    return { user, token: createAccessToken(user), refreshToken: nextRefreshToken };
};

const generateMfaSetup = async (user) => {
    const secret = speakeasy.generateSecret({
        name: `CRAFTATHON DreamBuilders (${user.email})`,
        issuer: 'Gandhinagar University',
        length: 20,
    });

    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);
    return {
        secretBase32: secret.base32,
        otpauthUrl: secret.otpauth_url,
        qrCodeDataUrl,
    };
};

const verifyTotp = (secret, code) => {
    return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: String(code || '').trim(),
        window: 1,
    });
};

module.exports = {
    ACCESS_EXPIRES_IN,
    REFRESH_EXPIRES_IN,
    createAccessToken,
    createRefreshToken,
    issueSession,
    setRefreshCookie,
    clearRefreshCookie,
    verifyRefreshTokenRecord,
    rotateRefreshToken,
    generateMfaSetup,
    verifyTotp,
    COOKIE_NAME,
    hashToken,
};