const express = require('express');
const router = express.Router();
const { register, login, refreshToken, getCurrentUser } = require('../controllers/authController');
const auth = require('../middleware/auth');

// Register new user
router.post('/register', register);

// Login user
router.post('/login', login);

// Refresh token
router.post('/refresh-token', refreshToken);

// Get current user
router.get('/me', auth, getCurrentUser);

module.exports = router; 