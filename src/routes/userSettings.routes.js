import express from 'express';
import {
  getSettings,
  updateSettings,
  deleteSettings
} from '../controllers/userSettings.controller.js';

const router = express.Router();

router.get('/:userId', getSettings);
router.put('/:userId', updateSettings);
router.delete('/:userId', deleteSettings);

export default router;
