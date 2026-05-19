const express = require('express');
const { registerUser, loginUser, getUserProfile, updateUserBudget } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.get('/profile', protect, getUserProfile);
router.put('/budget', protect, updateUserBudget);

module.exports = router;
