import express from 'express';
import { registerUser, registerDoctor, login } from '../controllers/auth.controller.js';


const router = express.Router();

// Authentication Routes
router.post('/register/user', registerUser);
router.post('/register/doctor', registerDoctor);
router.post('/login', login);

export default router;