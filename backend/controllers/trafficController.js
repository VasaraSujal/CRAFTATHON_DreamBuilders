const TrafficLog = require('../models/TrafficLog');
const Alert = require('../models/Alert');
const { generateTraffic } = require('../services/simulationEngine');
const { processTraffic } = require('../services/trafficService');

// @desc    Get dashboard statistics
// @route   GET /api/traffic/stats
// @access  Private
const getTrafficStats = async (req, res) => {
    try {
        const totalTraffic = await TrafficLog.countDocuments();
        const totalAlerts = await Alert.countDocuments();
        
        const alertsBySeverity = await Alert.aggregate([
            { $group: { _id: '$severity', count: { $sum: 1 } } }
        ]);
        
        const trafficByStatus = await TrafficLog.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        
        const recentAlerts = await Alert.find().populate('logId').sort({ timestamp: -1 }).limit(5);

        res.json({
            totalTraffic,
            totalAlerts,
            alertsBySeverity,
            trafficByStatus,
            recentAlerts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Get all traffic logs
// @route   GET /api/traffic
// @access  Private
const getTraffic = async (req, res) => {
    try {
        const {
            limit = 100,
            severity,
            status,
            attackType,
            protocol,
            source,
            destination,
            modelType,
            from,
            to,
        } = req.query;

        const query = {};

        if (severity) query.severity = severity;
        if (status) query.status = status;
        if (attackType) query.attackType = attackType;
        if (protocol) query.protocol = protocol.toUpperCase();
        if (source) query.source = source;
        if (destination) query.destination = destination;
        if (modelType) query.modelType = modelType;
        if (from || to) {
            query.timestamp = {};
            if (from) query.timestamp.$gte = new Date(from);
            if (to) query.timestamp.$lte = new Date(to);
        }

        const traffic = await TrafficLog.find(query)
            .sort({ timestamp: -1 })
            .limit(Number(limit));
        res.json(traffic);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all alerts
// @route   GET /api/alerts
// @access  Private
const getAlerts = async (req, res) => {
    try {
        const { severity, resolved, limit = 200, from, to } = req.query;
        const query = {};

        if (severity) query.severity = severity;
        if (resolved !== undefined) query.resolved = resolved === 'true';
        if (from || to) {
            query.timestamp = {};
            if (from) query.timestamp.$gte = new Date(from);
            if (to) query.timestamp.$lte = new Date(to);
        }

        const alerts = await Alert.find(query)
            .populate('logId')
            .sort({ timestamp: -1 })
            .limit(Number(limit));
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Simulate an attack
// @route   POST /api/simulate
// @access  Private
const simulateAttack = async (req, res) => {
    try {
        const { type } = req.body; // 'attack' or 'normal'
        const log = await generateTraffic(type === 'attack', {
            sourceType: 'simulation',
            modelType: req.body.modelType || 'isolation',
        });
        
        // Emit via WebSocket for real-time monitoring
        const io = req.app.get('io');
        if (io) {
            io.emit('newTraffic', log);
            if (log.status === 'Anomaly') {
                const latestAlert = await Alert.findOne({ logId: log._id });
                if (latestAlert) {
                    io.emit('newAlert', latestAlert);
                }
            }
        }

        res.status(201).json(log);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Ingest one or more traffic metadata events
// @route   POST /api/traffic/ingest
// @access  Private
const ingestTraffic = async (req, res) => {
    try {
        const payload = Array.isArray(req.body) ? req.body : [req.body];

        if (!payload.length) {
            return res.status(400).json({ message: 'Request body cannot be empty' });
        }

        const logs = [];
        for (const item of payload) {
            const log = await processTraffic(item, {
                sourceType: item.sourceType || 'dataset',
                modelType: item.modelType || 'isolation',
            });
            logs.push(log);
        }

        res.status(201).json({ count: logs.length, logs });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Resolve/unresolve alert status
// @route   PATCH /api/alerts/:id/resolve
// @access  Private (Admin/Analyst)
const resolveAlert = async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id);
        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        alert.resolved = req.body.resolved !== undefined ? Boolean(req.body.resolved) : true;
        await alert.save();

        res.json(alert);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Audit summary for security review
// @route   GET /api/audit
// @access  Private
const getAuditSummary = async (req, res) => {
    try {
        const [
            totalLogs,
            totalAlerts,
            unresolvedAlerts,
            attacksByType,
            trafficByProtocol,
            topTalkers,
        ] = await Promise.all([
            TrafficLog.countDocuments(),
            Alert.countDocuments(),
            Alert.countDocuments({ resolved: false }),
            TrafficLog.aggregate([
                { $match: { attackType: { $ne: 'None' } } },
                { $group: { _id: '$attackType', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            TrafficLog.aggregate([
                { $group: { _id: '$protocol', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            TrafficLog.aggregate([
                { $group: { _id: '$source', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
        ]);

        res.json({
            totalLogs,
            totalAlerts,
            unresolvedAlerts,
            attacksByType,
            trafficByProtocol,
            topTalkers,
            generatedAt: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getTraffic,
    getAlerts,
    simulateAttack,
    getTrafficStats,
    ingestTraffic,
    resolveAlert,
    getAuditSummary,
};
