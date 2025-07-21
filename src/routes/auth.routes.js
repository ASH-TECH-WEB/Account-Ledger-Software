import express from 'express';
import { registerUser, registerDoctor, login } from '../controllers/authController.js';


const router = express.Router();

// Authentication Routes
router.post('/register/user', registerUser);
router.post('/register/doctor', registerDoctor);
router.post('/login', login);

export default router;