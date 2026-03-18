import express from 'express';
import {
joinQueue,
getQueueStatus,
cancelQueue,
getQueueHistory,
getActiveQueue,
} from '../controllers/queueController';
import { authenticate, isUser } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// User queue routes
router.post('/join', isUser, joinQueue);
router.get('/active', isUser, getActiveQueue);
router.get('/history', isUser, getQueueHistory);
router.get('/:queueId/status', isUser, getQueueStatus);
router.delete('/:queueId/cancel', isUser, cancelQueue);

export default router;