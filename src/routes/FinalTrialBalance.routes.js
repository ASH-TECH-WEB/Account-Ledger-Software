/**
 * Final Trial Balance Routes
 * 
 * Defines API endpoints for trial balance reports and financial summaries
 * in the Account Ledger Software.
 * 
 * Endpoints:
 * - GET / - Get complete trial balance
 * - GET /party/:partyName - Get trial balance for specific party
 * - POST /report - Generate custom trial balance report
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  getFinalTrialBalance,
  getPartyBalance,
  generateReport,
  clearCache,
  getPerformanceMetrics,
  forceRefreshTrialBalance
} = require('../controllers/FinalTrialBalance.controller');

// Apply authentication to all routes
router.use(authenticateToken);

// Get final trial balance
router.get('/', getFinalTrialBalance);

// Force refresh trial balance (bypass cache for real-time updates)
router.get('/refresh', forceRefreshTrialBalance);

// Get trial balance for specific party
router.get('/party/:partyName', getPartyBalance);

// Generate custom trial balance report
router.post('/report', generateReport);

// Clear cache (for performance optimization)
router.delete('/cache', clearCache);

// Get performance metrics
router.get('/performance', getPerformanceMetrics);

module.exports = router; 