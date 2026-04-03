const express = require('express');
const router = express.Router();
const {
	registerUser,
	authUser,
	createUserByAdmin,
	getAllUsers,
	updateUserRole,
	deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', registerUser);
router.post('/login', authUser);

// Admin-only endpoints
router.post('/admin', protect, authorize('Admin'), createUserByAdmin);
router.get('/', protect, authorize('Admin'), getAllUsers);
router.patch('/:id/role', protect, authorize('Admin'), updateUserRole);
router.delete('/:id', protect, authorize('Admin'), deleteUser);

module.exports = router;
