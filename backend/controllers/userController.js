const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
    const secret = process.env.JWT_SECRET || 'supersecretkey';
    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }
    const token = jwt.sign({ id: id.toString() }, secret, {
        expiresIn: '30d',
    });
    console.log(`✓ Token generated for user ${id}: ${token.substring(0, 20)}...`);
    return token;
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400).json({ message: 'User already exists' });
        return;
    }

    const user = await User.create({
        name,
        email,
        password,
        role: role || 'Monitor',
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

// @desc    Admin create user
// @route   POST /api/users/admin
// @access  Private/Admin
const createUserByAdmin = async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
        name,
        email,
        password,
        role: role || 'Monitor',
    });

    return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
    });
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users', error: error.message });
    }
};

// @desc    Update user role
// @route   PATCH /api/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ message: 'Role is required' });
        }

        const allowedRoles = ['Admin', 'Analyst', 'Monitor'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role value' });
        }

        const userToUpdate = await User.findById(req.params.id);
        if (!userToUpdate) {
            return res.status(404).json({ message: 'User not found' });
        }

        userToUpdate.role = role;
        await userToUpdate.save();

        return res.json({
            _id: userToUpdate._id,
            name: userToUpdate.name,
            email: userToUpdate.email,
            role: userToUpdate.role,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update user role', error: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user', error: error.message });
    }
};

module.exports = {
    registerUser,
    authUser,
    createUserByAdmin,
    getAllUsers,
    updateUserRole,
    deleteUser,
};
