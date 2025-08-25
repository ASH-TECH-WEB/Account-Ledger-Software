/**
 * User Settings Routes
 * 
 * Defines API endpoints for user settings and preferences management
 * in the Account Ledger Software.
 * 
 * Endpoints:
 * - GET /:userId - Get user settings
 * - POST / - Create user settings
 * - PUT /:userId - Update user settings
 * - DELETE /:userId - Delete user settings
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  getUserSettings,
  createUserSettings,
  updateUserSettings,
  deleteUserSettings
} = require('../controllers/userSettings.controller');

// Apply authentication to all routes
router.use(authenticateToken);

// Get user settings
router.get('/:userId', getUserSettings);

// Create user settings
router.post('/', createUserSettings);

// Update user settings
router.put('/:userId', updateUserSettings);

// Delete user settings
router.delete('/:userId', deleteUserSettings);

module.exports = router; 