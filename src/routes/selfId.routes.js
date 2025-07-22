import express from 'express';
import { createSelfId, getAllSelfIds } from '../controllers/selfId.controller.js';

const router = express.Router();

router.post('/', createSelfId);
router.get('/', getAllSelfIds);

export default router;
