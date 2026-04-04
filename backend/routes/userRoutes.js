const express = require('express');
const router = express.Router();
const {
	registerUser,
	authUser,
	loginMfa,
	refreshSession,
	logoutUser,
	setupMfa,
	enableMfa,
	disableMfa,
	createUserByAdmin,
	getAllUsers,
	getPendingUsers,
	updateUserApproval,
	updateUserRole,
	deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { registerLimiter, authLimiter, adminActionLimiter, adminIpLockdown } = require('../middleware/security');

router.post('/', registerLimiter, registerUser);
router.post('/login', authLimiter, authUser);
router.post('/login/mfa', authLimiter, loginMfa);
router.post('/refresh', refreshSession);
router.post('/logout', logoutUser);
router.post('/mfa/setup', protect, setupMfa);
router.post('/mfa/enable', protect, enableMfa);
router.post('/mfa/disable', protect, disableMfa);

// Admin-only endpoints
router.post('/admin', protect, authorize('Admin'), adminIpLockdown, adminActionLimiter, createUserByAdmin);
router.get('/', protect, authorize('Admin'), adminIpLockdown, getAllUsers);
router.get('/pending', protect, authorize('Admin'), adminIpLockdown, adminActionLimiter, getPendingUsers);
router.patch('/:id/approval', protect, authorize('Admin'), adminIpLockdown, adminActionLimiter, updateUserApproval);
router.patch('/:id/role', protect, authorize('Admin'), adminIpLockdown, adminActionLimiter, updateUserRole);
router.delete('/:id', protect, authorize('Admin'), adminIpLockdown, adminActionLimiter, deleteUser);

module.exports = router;
