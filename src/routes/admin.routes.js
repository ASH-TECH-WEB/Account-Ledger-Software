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
  getDashboardData,
  getDashboardStats,
  getAllUsers,
  getSystemHealth,
  deleteUser,
  resetUserPassword,
  getUserById,
  getPendingUsers,
  approveUser,
  disapproveUser,
  createUser,
  updateUser,
  toggleUserStatus,
  updateUserRole,
  bulkUserActions,
  getUserActivity,
  exportUsers
} = require('../controllers/admin.controller');

// Batch API - Get all dashboard data in single request
router.get('/dashboard-data', getDashboardData);

// Admin dashboard statistics
router.get('/stats', getDashboardStats);

// Recent activity feature removed

// User management
router.get('/users', getAllUsers);

// System health check
router.get('/health', getSystemHealth);

// Enhanced User management routes
router.post('/users', createUser);
router.get('/users/:userId', getUserById);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);
router.put('/users/:userId/reset-password', resetUserPassword);
router.put('/users/:userId/toggle-status', toggleUserStatus);
router.put('/users/:userId/role', updateUserRole);
router.get('/users/:userId/activity', getUserActivity);

// Bulk operations
router.post('/users/bulk-actions', bulkUserActions);

// Export functionality
router.get('/users/export', exportUsers);

// User approval routes
router.get('/pending-users', getPendingUsers);
router.put('/users/:userId/approve', approveUser);
router.delete('/users/:userId/disapprove', disapproveUser);

// Admin routes info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Enhanced Admin API is running',
    endpoints: {
      stats: 'GET /stats - Dashboard statistics',
      users: 'GET /users - User management with pagination and search',
      health: 'GET /health - System health status',
      createUser: 'POST /users - Create new user',
      getUser: 'GET /users/:userId - Get user details',
      updateUser: 'PUT /users/:userId - Update user information',
      deleteUser: 'DELETE /users/:userId - Delete user',
      resetPassword: 'PUT /users/:userId/reset-password - Reset user password',
      toggleStatus: 'PUT /users/:userId/toggle-status - Enable/Disable user',
      updateRole: 'PUT /users/:userId/role - Update user role',
      getUserActivity: 'GET /users/:userId/activity - Get user activity log',
      bulkActions: 'POST /users/bulk-actions - Bulk user operations',
      exportUsers: 'GET /users/export - Export users data',
      pendingUsers: 'GET /pending-users - Get users awaiting approval',
      approveUser: 'PUT /users/:userId/approve - Approve a user',
      disapproveUser: 'DELETE /users/:userId/disapprove - Disapprove a user'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
