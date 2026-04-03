const express = require('express');
const router = express.Router();
const {
	getTraffic,
	getAlerts,
	simulateAttack,
	getLiveTraffic,
	getTrafficGraph,
	getTrafficStats,
	ingestTraffic,
	resolveAlert,
	getAuditSummary,
} = require('../controllers/trafficController');
const { protect, authorize } = require('../middleware/auth');

router.get('/traffic', protect, getTraffic);
router.get('/traffic/live', protect, getLiveTraffic);
router.get('/traffic/graph', protect, getTrafficGraph);
router.post('/traffic/ingest', protect, ingestTraffic);
router.get('/alerts', protect, getAlerts);
router.patch('/alerts/:id/resolve', protect, authorize('Admin', 'Analyst'), resolveAlert);
router.get('/stats', protect, getTrafficStats);
router.get('/audit', protect, authorize('Admin', 'Analyst'), getAuditSummary);
router.post('/simulate', protect, authorize('Admin', 'Analyst'), simulateAttack);

module.exports = router;
