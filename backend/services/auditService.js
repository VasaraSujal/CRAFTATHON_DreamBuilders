const AuditLog = require('../models/AuditLog');

const recordAuditEvent = async ({
    actor = null,
    action,
    targetType = '',
    targetId = '',
    status = 'success',
    details = {},
    req = null,
}) => {
    try {
        await AuditLog.create({
            actor: actor?._id || actor || null,
            actorName: actor?.name || '',
            actorRole: actor?.role || '',
            action,
            targetType,
            targetId,
            status,
            details,
            ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || '',
            userAgent: req?.headers?.['user-agent'] || '',
        });
    } catch (error) {
        console.warn('Audit log write failed:', error.message);
    }
};

module.exports = { recordAuditEvent };