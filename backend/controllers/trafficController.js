const TrafficLog = require('../models/TrafficLog');
const Alert = require('../models/Alert');
const { generateTraffic } = require('../services/simulationEngine');
const { generateRealtimeTraffic } = require('../services/realtimeFeed');
const { processTraffic } = require('../services/trafficService');

// @desc    Get dashboard statistics
// @route   GET /api/traffic/stats
// @access  Private
const getTrafficStats = async (req, res) => {
    try {
        const [
            totalTraffic,
            totalAlerts,
            alertsBySeverity,
            trafficByStatus,
            recentAlerts,
            averageSignal,
            threatCategoryCounts,
            datasetCoverage,
        ] = await Promise.all([
            TrafficLog.countDocuments(),
            Alert.countDocuments(),
            Alert.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
            TrafficLog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Alert.find().populate('logId').sort({ timestamp: -1 }).limit(5),
            TrafficLog.aggregate([
                {
                    $group: {
                        _id: null,
                        avgAvailability: { $avg: '$signalAvailability' },
                        avgIntegrity: { $avg: '$signalIntegrity' },
                        avgJamming: { $avg: '$jammingRisk' },
                        avgSpoofing: { $avg: '$spoofingRisk' },
                        avgIntrusion: { $avg: '$intrusionRisk' },
                    },
                },
            ]),
            TrafficLog.aggregate([{ $group: { _id: '$threatCategory', count: { $sum: 1 } } }]),
            TrafficLog.aggregate([{ $group: { _id: '$datasetSource', count: { $sum: 1 } } }]),
        ]);

        const avg = averageSignal[0] || {
            avgAvailability: 100,
            avgIntegrity: 100,
            avgJamming: 0,
            avgSpoofing: 0,
            avgIntrusion: 0,
        };

        res.json({
            totalTraffic,
            totalAlerts,
            alertsBySeverity,
            trafficByStatus,
            recentAlerts,
            signalHealth: {
                availability: Math.round(avg.avgAvailability || 0),
                integrity: Math.round(avg.avgIntegrity || 0),
                jammingRisk: Math.round(avg.avgJamming || 0),
                spoofingRisk: Math.round(avg.avgSpoofing || 0),
                intrusionRisk: Math.round(avg.avgIntrusion || 0),
            },
            threatCategoryCounts,
            datasetCoverage,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get signal availability and integrity status
// @route   GET /api/signals/status
// @access  Private
const getSignalStatus = async (req, res) => {
    try {
        const recentWindow = Number(req.query.window || 200);

        const [metrics] = await TrafficLog.aggregate([
            { $sort: { timestamp: -1 } },
            { $limit: recentWindow },
            {
                $group: {
                    _id: null,
                    avgAvailability: { $avg: '$signalAvailability' },
                    avgIntegrity: { $avg: '$signalIntegrity' },
                    maxJammingRisk: { $max: '$jammingRisk' },
                    maxSpoofingRisk: { $max: '$spoofingRisk' },
                    maxIntrusionRisk: { $max: '$intrusionRisk' },
                    anomalies: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'Anomaly'] }, 1, 0],
                        },
                    },
                    total: { $sum: 1 },
                },
            },
        ]);

        if (!metrics) {
            return res.json({
                availability: 100,
                integrity: 100,
                maxJammingRisk: 0,
                maxSpoofingRisk: 0,
                maxIntrusionRisk: 0,
                anomalyRate: 0,
                signalStatus: 'Nominal',
            });
        }

        const anomalyRate = metrics.total ? Math.round((metrics.anomalies / metrics.total) * 100) : 0;
        let signalStatus = 'Nominal';
        if (metrics.avgAvailability < 60 || metrics.avgIntegrity < 60 || anomalyRate > 35) {
            signalStatus = 'Critical';
        } else if (metrics.avgAvailability < 75 || metrics.avgIntegrity < 75 || anomalyRate > 18) {
            signalStatus = 'Degraded';
        }

        return res.json({
            availability: Math.round(metrics.avgAvailability || 0),
            integrity: Math.round(metrics.avgIntegrity || 0),
            maxJammingRisk: Math.round(metrics.maxJammingRisk || 0),
            maxSpoofingRisk: Math.round(metrics.maxSpoofingRisk || 0),
            maxIntrusionRisk: Math.round(metrics.maxIntrusionRisk || 0),
            anomalyRate,
            signalStatus,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Get one live traffic sample from the dataset stream
// @route   GET /api/traffic/live
// @access  Private
const getLiveTraffic = async (req, res) => {
    try {
        const log = await generateRealtimeTraffic({
            modelType: req.query.modelType || 'isolation',
            datasetSource: req.query.datasetSource || 'RealtimeStream',
        });

        res.json(log);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get network graph data
// @route   GET /api/traffic/graph
// @access  Private
const getTrafficGraph = async (req, res) => {
    try {
        const recent = await TrafficLog.find({})
            .sort({ timestamp: -1 })
            .limit(80)
            .lean();

        const nodeMap = new Map();
        const edgeMap = new Map();

        recent.forEach((item, index) => {
            const sourceId = `node-${String(item.source).replace(/\./g, '-')}`;
            const destinationId = `node-${String(item.destination).replace(/\./g, '-')}`;

            if (!nodeMap.has(sourceId)) {
                nodeMap.set(sourceId, {
                    id: sourceId,
                    label: item.source,
                    status: item.status,
                    type: 'source',
                    x: 80 + (index % 5) * 220,
                    y: 60 + Math.floor(index / 5) * 110,
                });
            }

            if (!nodeMap.has(destinationId)) {
                nodeMap.set(destinationId, {
                    id: destinationId,
                    label: item.destination,
                    status: item.status,
                    type: 'destination',
                    x: 150 + ((index + 2) % 5) * 220,
                    y: 130 + Math.floor((index + 2) / 5) * 110,
                });
            }

            const edgeId = `${sourceId}-${destinationId}`;
            const existing = edgeMap.get(edgeId);

            if (existing) {
                existing.count += 1;
                existing.status = item.status === 'Anomaly' ? 'Anomaly' : existing.status;
            } else {
                edgeMap.set(edgeId, {
                    id: edgeId,
                    source: sourceId,
                    target: destinationId,
                    status: item.status,
                    count: 1,
                });
            }
        });

        res.json({
            nodes: Array.from(nodeMap.values()),
            edges: Array.from(edgeMap.values()),
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
            threatCategory,
            datasetSource,
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
        if (threatCategory) query.threatCategory = threatCategory;
        if (datasetSource) query.datasetSource = datasetSource;
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
        const { type } = req.body; // 'attack' / 'normal' / attack type name
        const attackKinds = ['ddos', 'spoofing', 'intrusion'];
        const normalizedType = String(type || 'attack').toLowerCase();
        const shouldAttack = normalizedType === 'attack' || attackKinds.includes(normalizedType);

        const log = await generateTraffic(shouldAttack, {
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
                datasetSource: item.datasetSource || 'ManualIngest',
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
    getLiveTraffic,
    getTrafficGraph,
    getTrafficStats,
    getSignalStatus,
    ingestTraffic,
    resolveAlert,
    getAuditSummary,
};
