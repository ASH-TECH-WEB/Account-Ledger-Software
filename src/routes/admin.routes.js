/**
 * Admin Routes
 * 
 * Defines API endpoints for admin operations and dashboard
 * 
 * Endpoints:
 * - GET /stats - Get dashboard statistics
 * - GET /activity - Get recent activity
 * - GET /users - Get all users with pagination
 * - GET /health - Get system health status
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getRecentActivity,
  getAllUsers,
  getSystemHealth,
  deleteUser,
  resetUserPassword,
  getUserById,
  getPendingUsers,
  approveUser,
  disapproveUser
} = require('../controllers/admin.controller');

// Admin dashboard statistics
router.get('/stats', getDashboardStats);

// Recent activity feed
router.get('/activity', getRecentActivity);

// User management
router.get('/users', getAllUsers);

// System health check
router.get('/health', getSystemHealth);

// User management routes
router.get('/users/:userId', getUserById);
router.delete('/users/:userId', deleteUser);
router.put('/users/:userId/reset-password', resetUserPassword);

// User approval routes
router.get('/pending-users', getPendingUsers);
router.put('/users/:userId/approve', approveUser);
router.delete('/users/:userId/disapprove', disapproveUser);

// Admin routes info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Admin API is running',
    endpoints: {
      stats: 'GET /stats - Dashboard statistics',
      activity: 'GET /activity - Recent activity feed',
      users: 'GET /users - User management',
      health: 'GET /health - System health status',
      getUser: 'GET /users/:userId - Get user details',
      deleteUser: 'DELETE /users/:userId - Delete user',
      resetPassword: 'PUT /users/:userId/reset-password - Reset user password',
      pendingUsers: 'GET /pending-users - Get users awaiting approval',
      approveUser: 'PUT /users/:userId/approve - Approve a user',
      disapproveUser: 'DELETE /users/:userId/disapprove - Disapprove a user'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
