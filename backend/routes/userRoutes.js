const express = require('express');
const router = express.Router();
const { registerUser, authUser, getAllUsers, deleteUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', registerUser);
router.post('/login', authUser);

// Admin-only endpoints
router.get('/', protect, authorize('Admin'), getAllUsers);
router.delete('/:id', protect, authorize('Admin'), deleteUser);

module.exports = router;
