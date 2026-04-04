const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/trafficController');
const { protect, authorize } = require('../middleware/auth');
const { trafficMutationLimiter, adminActionLimiter, adminIpLockdown } = require('../middleware/security');

router.get('/traffic', protect, getTraffic);
router.get('/traffic/live', protect, getLiveTraffic);
router.get('/traffic/graph', protect, getTrafficGraph);
router.get('/signals/status', protect, getSignalStatus);
router.post('/traffic/ingest', protect, trafficMutationLimiter, ingestTraffic);
router.get('/alerts', protect, getAlerts);
router.patch('/alerts/:id/resolve', protect, authorize('Admin', 'Analyst'), adminActionLimiter, resolveAlert);
router.get('/stats', protect, getTrafficStats);
router.get('/audit', protect, authorize('Admin', 'Analyst'), adminIpLockdown, adminActionLimiter, getAuditSummary);
router.post('/simulate', protect, authorize('Admin', 'Analyst'), trafficMutationLimiter, simulateAttack);

module.exports = router;
