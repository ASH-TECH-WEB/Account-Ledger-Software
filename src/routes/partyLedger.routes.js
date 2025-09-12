/**
 * Party Ledger Routes
 * 
 * Defines API endpoints for party ledger management and transactions
 * in the Account Ledger Software.
 * 
 * All endpoints now use the original controller for consistency and completeness.
 * 
 * Endpoints:
 * - GET / - Get all parties for ledger view
 * - GET /:partyName - Get ledger entries for specific party
 * - POST /entry - Add new ledger entry
 * - PUT /entry/:id - Update ledger entry
 * - DELETE /entry/:id - Delete ledger entry
 * - DELETE /parties - Delete multiple parties
 * 
 * @author Account Ledger Team
 * @version 2.0.0 - All functions use original controller
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  getAllParties,
  getPartyLedger,
  addEntry,
  updateEntry,
  deleteEntry,
  deleteParties,
  recalculateAllBalances,
  unsettleTransactions,
  updateMondayFinal,
  recalculatePartyBalances,
  deleteMondayFinalEntry
} = require('../controllers/partyLedger.controller');

// Apply authentication to all routes
router.use(authenticateToken);

// Get all parties for ledger (original version)
router.get('/', getAllParties);

// Get ledger for specific party (original version)
router.get('/:partyName', getPartyLedger);

// Add new ledger entry
router.post('/entry', addEntry);

// Update ledger entry
router.put('/entry/:id', updateEntry);

// Delete ledger entry
router.delete('/entry/:id', deleteEntry);

// Recalculate all balances (admin utility)
router.post('/recalculate-balances', recalculateAllBalances);

// Unsettle transactions for Monday Final
router.post('/unsettle-transactions', unsettleTransactions);

// Update Monday Final status
router.post('/update-monday-final', updateMondayFinal);

// Delete Monday Final entry and unsettle its transactions
router.delete('/monday-final/:entryId', deleteMondayFinalEntry);

// Recalculate party balances
router.post('/recalculate-party-balances', recalculatePartyBalances);

// Delete multiple parties
router.delete('/parties', deleteParties);

module.exports = router; 