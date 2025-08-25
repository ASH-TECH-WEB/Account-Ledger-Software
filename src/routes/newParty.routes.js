/**
 * New Party Routes
 * 
 * Defines API endpoints for party management and CRUD operations
 * in the Account Ledger Software.
 * 
 * Endpoints:
 * - GET / - Get all parties
 * - GET /:id - Get specific party by ID
 * - POST / - Create new party
 * - PUT /:id - Update party information
 * - DELETE /:id - Delete party
 * - GET /next-sr-no - Get next SR number
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const {
  getNextSrNo,
  getAllParties,
  getPartyById,
  createParty,
  updateParty,
  deleteParty,
  bulkDeleteParties
} = require('../controllers/newParty.controller');

// Apply authentication to all routes
router.use(authenticateToken);

// Get next SR number
router.get('/next-sr-no', getNextSrNo);

// Get all parties
router.get('/', getAllParties);

// Get party by ID
router.get('/:id', getPartyById);

// Create new party
router.post('/', createParty);

// Update party
router.put('/:id', updateParty);

// Delete party
router.delete('/:id', deleteParty);

// Bulk delete parties
router.delete('/', bulkDeleteParties);

module.exports = router; 