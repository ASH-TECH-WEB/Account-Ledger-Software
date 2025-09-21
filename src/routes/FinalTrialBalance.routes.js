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

// Import ultra-optimized controllers
const {
  getFinalTrialBalanceUltraOptimized,
  getTrialBalanceSummaryUltraOptimized
} = require('../controllers/FinalTrialBalanceUltraOptimized.controller');

// Apply authentication to all routes
router.use(authenticateToken);

// Get final trial balance (ultra-optimized version)
router.get('/', getFinalTrialBalanceUltraOptimized);

// Get trial balance summary (ultra-optimized version)
router.get('/summary', getTrialBalanceSummaryUltraOptimized);

// Force refresh trial balance (bypass cache for real-time updates)
router.get('/refresh', forceRefreshTrialBalance);

// Get trial balance for specific party
router.get('/party/:partyName', getPartyBalance);

// Generate custom trial balance report
router.post('/report', generateReport);

// NEW: Batch API for getting multiple party balances at once
router.post('/batch-balances', async (req, res) => {
  try {
    const { partyNames } = req.body;
    
    if (!partyNames || !Array.isArray(partyNames)) {
      return res.status(400).json({
        success: false,
        message: 'Party names array is required'
      });
    }

    // Get balances for all parties in parallel
    const balances = await Promise.all(
      partyNames.map(async (partyName) => {
        try {
          const partyBalance = await getPartyBalance(req, res, true); // Silent mode
          return {
            partyName,
            closingBalance: partyBalance?.balance || 0
          };
        } catch (error) {
          return {
            partyName,
            closingBalance: 0
          };
        }
      })
    );

    res.json({
      success: true,
      data: balances
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get batch balances',
      error: error.message
    });
  }
});

// Clear cache (for performance optimization)
router.delete('/cache', clearCache);

// Get performance metrics
router.get('/performance', getPerformanceMetrics);

module.exports = router; 