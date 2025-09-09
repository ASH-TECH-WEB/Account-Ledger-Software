/**
 * Dashboard Routes
 * 
 * API routes for dashboard statistics and analytics.
 * Provides real-time data for the dashboard interface.
 * 
 * Features:
 * - Dashboard statistics endpoint
 * - Analytics and reporting
 * - Real-time data aggregation
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middlewares/auth');

/**
 * GET /api/dashboard
 * 
 * General dashboard endpoint that provides overall dashboard data
 * 
 * @requires Authentication
 * @returns {Object} Complete dashboard data
 */
router.get('/', authenticateToken, (req, res) => {
  dashboardController.getDashboardStats(req, res);
});

/**
 * GET /api/dashboard/stats
 * 
 * Retrieves dashboard statistics including:
 * - Total parties count
 * - Total transactions count
 * - Total balance
 * - Settlement statistics
 * - Growth metrics
 * 
 * @requires Authentication
 * @returns {Object} Dashboard statistics
 */
router.get('/stats', authenticateToken, (req, res) => {
  dashboardController.getDashboardStats(req, res);
});

// Recent activity feature removed

/**
 * GET /api/dashboard/summary-stats
 * 
 * Retrieves summary statistics with optional date filtering
 * 
 * @requires Authentication
 * @returns {Object} Summary statistics
 */
router.get('/summary-stats', authenticateToken, (req, res) => {
  dashboardController.getSummaryStats(req, res);
});

module.exports = router; 