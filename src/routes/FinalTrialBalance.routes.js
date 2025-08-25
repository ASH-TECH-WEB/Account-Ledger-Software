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
  generateReport
} = require('../controllers/FinalTrialBalance.controller');

// Apply authentication to all routes
router.use(authenticateToken);

// Get final trial balance
router.get('/', getFinalTrialBalance);

// Get trial balance for specific party
router.get('/party/:partyName', getPartyBalance);

// Generate trial balance report
router.post('/report', generateReport);

module.exports = router; 