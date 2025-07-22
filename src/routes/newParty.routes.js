import express from 'express';
import {
  createNewParty,
  getAllParties
} from '../controllers/newParty.controller.js';

const router = express.Router();

// Create new party
router.post('/', createNewParty);

// Get all parties
router.get('/', getAllParties);

export default router;
