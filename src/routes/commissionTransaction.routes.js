/**
 * Commission Transaction Routes - Supabase Version
 * 
 * Defines all API routes for commission transactions
 * 
 * @author Account Ledger Team
 * @version 2.0.0
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  createCommissionTransaction,
  getAllCommissionTransactions,
  getCommissionTransaction,
  getCommissionTransactionSummary,
  cancelCommissionTransaction
} = require('../controllers/commissionTransaction.controller');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/commission-transactions
 * @desc Create a new commission transaction
 * @access Private
 */
router.post('/', createCommissionTransaction);

/**
 * @route GET /api/commission-transactions
 * @desc Get all commission transactions for the authenticated user
 * @access Private
 */
router.get('/', getAllCommissionTransactions);

/**
 * @route GET /api/commission-transactions/summary
 * @desc Get commission transaction summary and statistics
 * @access Private
 */
router.get('/summary', getCommissionTransactionSummary);

/**
 * @route GET /api/commission-transactions/:transactionId
 * @desc Get a specific commission transaction
 * @access Private
 */
router.get('/:transactionId', getCommissionTransaction);

/**
 * @route POST /api/commission-transactions/:transactionId/cancel
 * @desc Cancel a commission transaction
 * @access Private
 */
router.post('/:transactionId/cancel', cancelCommissionTransaction);

module.exports = router; 