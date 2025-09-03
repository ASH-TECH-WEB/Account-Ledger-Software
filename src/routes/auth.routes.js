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
 * - POST /forgot-password - Initiate password reset
 * - POST /reset-password - Reset password with token
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
  forgotPassword,
  resetPassword,
  deleteAccount,
  logout
} = require('../controllers/auth.controller');

// Public routes
router.post('/register/user', register);
router.post('/google-login', googleLogin);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Add GET route for authentication status check
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication service is running',
    endpoints: {
      login: 'POST /login',
      register: 'POST /register/user',
      googleLogin: 'POST /google-login',
      forgotPassword: 'POST /forgot-password',
      resetPassword: 'POST /reset-password',
      profile: 'GET /profile (protected)',
      updateProfile: 'PUT /profile (protected)',
      changePassword: 'PUT /change-password (protected)',
      logout: 'POST /logout (protected)'
    }
  });
});

// Add GET route for checking if user is authenticated
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication status endpoint',
    authenticated: false,
    note: 'Use POST /login to authenticate'
  });
});

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);
router.delete('/account', authenticateToken, deleteAccount);
router.post('/logout', authenticateToken, logout);

module.exports = router; 