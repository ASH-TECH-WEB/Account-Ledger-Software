/**
 * Authentication Routes
 * 
 * Defines API endpoints for user authentication and profile management
 * in the Account Ledger Software.
 * 
 * Endpoints:
 * - POST /login - User login with email/password
 * - POST /google-login - Google OAuth login/registration
 * - POST /register/user - User registration (supports both email and Google)
 * - GET /profile - Get current user profile
 * - PUT /profile - Update user profile
 * - PUT /change-password - Change user password
 * - POST /logout - User logout
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  register,
  googleLogin,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout
} = require('../controllers/auth.controller');

// Public routes
router.post('/register/user', register);
router.post('/google-login', googleLogin);
router.post('/login', login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);
router.post('/logout', authenticateToken, logout);

module.exports = router; 