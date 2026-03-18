import express from 'express';
import {
getAllQueues,
serveNext,
scanQRToServe,
markAsServed,
markAsNoShow,
getCounterStatus,
updateCounterStatus,
getQueueAnalytics,
} from '../controllers/adminController';
import { authenticate, isStaff } from '../middleware/auth';

const router = express.Router();

// All routes require staff authentication
router.use(authenticate);
router.use(isStaff);

// Queue management
router.get('/queues', getAllQueues);
router.post('/serve-next', serveNext);
router.post('/scan-qr', scanQRToServe);
router.put('/queue/:queueId/served', markAsServed);
router.put('/queue/:queueId/no-show', markAsNoShow);

// Counter management
router.get('/counters', getCounterStatus);
router.put('/counter/:counterId/status', updateCounterStatus);

// Analytics
router.get('/analytics', getQueueAnalytics);

export default router;