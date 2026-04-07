const dotenv = require('dotenv');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Verify JWT_SECRET is loaded
if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET not set in .env, using fallback: supersecretkey');
    process.env.JWT_SECRET = 'supersecretkey';
} else {
    console.log('✓ JWT_SECRET loaded from environment');
}

if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = `${process.env.JWT_SECRET || 'supersecretkey'}-refresh`;
    if (process.env.NODE_ENV === 'production') {
        console.warn('JWT_REFRESH_SECRET not set in production. Using derived fallback from JWT_SECRET. Set JWT_REFRESH_SECRET explicitly for stronger security.');
    }
}

if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_IP_ALLOWLIST) {
    console.warn('ADMIN_IP_ALLOWLIST is not set. Admin route lockout will deny requests in production until configured.');
}

// Connect to Database
connectDB();

const PORT = process.env.PORT || 5000;
const ioOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'https://militarycommunicationsystem.netlify.app')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const ioAllowedSuffixes = (process.env.CORS_ALLOWED_SUFFIXES || '.netlify.app,.vercel.app')
    .split(',')
    .map((suffix) => suffix.trim().toLowerCase())
    .filter(Boolean);
const isLocalDevOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
const extractHost = (origin = '') => {
    try {
        return new URL(origin).hostname.toLowerCase();
    } catch {
        return '';
    }
};
const isAllowedBySuffix = (origin) => {
    const host = extractHost(origin);
    if (!host) return false;
    return ioAllowedSuffixes.some((suffix) => host === suffix.replace(/^\./, '') || host.endsWith(suffix));
};
const isAllowedIoOrigin = (origin) => {
    if (!origin) return true;
    if (ioOrigins.includes(origin)) return true;
    if (process.env.NODE_ENV !== 'production' && isLocalDevOrigin(origin)) return true;
    return isAllowedBySuffix(origin);
};

const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Setup Socket.io for Real-time events
const io = new Server(server, {
    cors: {
        origin(origin, callback) {
            if (isAllowedIoOrigin(origin)) {
                return callback(null, true);
            }

            return callback(new Error('CORS blocked for this origin'));
        },
        methods: ['GET', 'POST'],
        credentials: true,
    }
});

io.on('connection', (socket) => {
    const origin = socket.handshake.headers.origin;
    if (!isAllowedIoOrigin(origin)) {
        socket.disconnect(true);
        return;
    }

    console.log(`New WebSocket connection: ${socket.id}`);
    
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

app.set('io', io);
