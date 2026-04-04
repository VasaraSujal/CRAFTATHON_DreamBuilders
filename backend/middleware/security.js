const rateLimit = require('express-rate-limit');
const ipaddr = require('ipaddr.js');

const buildLimiter = (windowMs, max, message) => rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
});

const apiLimiter = buildLimiter(
    15 * 60 * 1000,
    1000,
    'Too many requests from this client. Please slow down.',
);

const authLimiter = buildLimiter(
    15 * 60 * 1000,
    10,
    'Too many login attempts. Please try again later.',
);

const registerLimiter = buildLimiter(
    60 * 60 * 1000,
    5,
    'Too many registration attempts. Please try again later.',
);

const adminActionLimiter = buildLimiter(
    15 * 60 * 1000,
    120,
    'Too many privileged actions. Please slow down.',
);

const trafficMutationLimiter = buildLimiter(
    15 * 60 * 1000,
    60,
    'Too many traffic mutation requests. Please slow down.',
);

const normalizeIp = (value = '') => {
    const raw = String(value).trim();
    if (!raw) return '';

    const stripped = raw.startsWith('::ffff:') ? raw.replace('::ffff:', '') : raw;

    try {
        const parsed = ipaddr.parse(stripped);
        if (parsed.kind() === 'ipv6' && parsed.isIPv4MappedAddress()) {
            return parsed.toIPv4Address().toString();
        }
        return parsed.toString();
    } catch {
        return stripped;
    }
};

const getClientIp = (req) => {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return normalizeIp(forwarded || req.ip || req.socket?.remoteAddress || '');
};

const ipMatchesRule = (clientIp, rule) => {
    const trimmedRule = String(rule || '').trim();
    if (!trimmedRule) return false;

    try {
        if (trimmedRule.includes('/')) {
            const [range, prefix] = ipaddr.parseCIDR(trimmedRule);
            return ipaddr.parse(clientIp).match(range, prefix);
        }

        return normalizeIp(trimmedRule) === normalizeIp(clientIp);
    } catch {
        return false;
    }
};

const adminIpLockdown = (req, res, next) => {
    const enforce = process.env.ADMIN_ROUTE_LOCKOUT === 'true' || process.env.NODE_ENV === 'production';
    if (!enforce) {
        return next();
    }

    const allowlist = String(process.env.ADMIN_IP_ALLOWLIST || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

    if (!allowlist.length) {
        return res.status(403).json({ message: 'Admin routes are locked until ADMIN_IP_ALLOWLIST is configured' });
    }

    const clientIp = getClientIp(req);
    const allowed = allowlist.some((entry) => ipMatchesRule(clientIp, entry));

    if (!allowed) {
        return res.status(403).json({ message: 'Admin route locked from this IP address' });
    }

    return next();
};

module.exports = {
    apiLimiter,
    authLimiter,
    registerLimiter,
    adminActionLimiter,
    trafficMutationLimiter,
    adminIpLockdown,
};