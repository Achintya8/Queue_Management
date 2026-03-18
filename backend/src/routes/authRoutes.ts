import express from 'express';
import {
registerUser,
loginUser,
loginStaff,
getProfile,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/staff/login', loginStaff);

// Protected routes
router.get('/profile', authenticate, getProfile);

export default router;