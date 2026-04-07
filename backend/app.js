const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { apiLimiter } = require('./middleware/security');
const trafficRoutes = require('./routes/trafficRoutes');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'https://militarycommunicationsystem.netlify.app')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOriginSuffixes = (process.env.CORS_ALLOWED_SUFFIXES || '.netlify.app,.vercel.app')
    .split(',')
    .map((suffix) => suffix.trim().toLowerCase())
    .filter(Boolean);

const extractHost = (origin = '') => {
    try {
        return new URL(origin).hostname.toLowerCase();
    } catch {
        return '';
    }
};

const isLocalDevOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
const isAllowedBySuffix = (origin) => {
    const host = extractHost(origin);
    if (!host) return false;
    return allowedOriginSuffixes.some((suffix) => host === suffix.replace(/^\./, '') || host.endsWith(suffix));
};

const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    if (!isProduction && isLocalDevOrigin(origin)) return true;
    return isAllowedBySuffix(origin);
};

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: false,
}));
app.use((req, res, next) => {
    if (isProduction && req.method !== 'OPTIONS') {
        const forwardedProto = String(req.get('x-forwarded-proto') || '').toLowerCase();
        if (!req.secure && forwardedProto !== 'https') {
            return res.status(426).json({ message: 'HTTPS is required' });
        }
    }

    return next();
});
app.use(cors({
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS blocked for this origin'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(apiLimiter);

// Routes
app.use('/api/users', userRoutes);
app.use('/api', trafficRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.send('Military Communication Monitoring System API is running...');
});

app.use((err, req, res, next) => {
    if (err && err.message === 'CORS blocked for this origin') {
        return res.status(403).json({ message: 'Origin not allowed' });
    }
    return next(err);
});

module.exports = app;
