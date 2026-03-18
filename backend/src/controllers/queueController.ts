import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../types';
import {
  getNextTokenNumber,
  calculateEstimatedWaitTime,
  getQueuePosition,
  getWaitingCount,
  updateQueueCache,
  getQueueFromCache,
  clearQueueCache,
} from '../services/queueService';
import { generateQRData } from '../utils/qrCode';

/**
* Join Queue - User joins the queue and gets QR code
*/
export const joinQueue = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { serviceId } = req.body;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        error: 'Service ID is required',
      });
    }

    // Check if service exists
    const serviceCheck = await pool.query(
      'SELECT service_id, service_name, avg_service_time FROM service_types WHERE service_id = $1 AND is_active = true',
      [serviceId]
    );

    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found or inactive',
      });
    }

    const service = serviceCheck.rows[0];

    // Check if user already in queue
    const existingQueue = await pool.query(
      "SELECT queue_id FROM queues WHERE user_id = $1 AND status IN ('waiting', 'called')",
      [userId]
    );

    if (existingQueue.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'You are already in a queue. Please wait or cancel first.',
        queueId: existingQueue.rows[0].queue_id,
      });
    }

    // Get next token number
    const tokenNumber = await getNextTokenNumber();

    // Insert into queue
    const result = await pool.query(
      `INSERT INTO queues (user_id, service_id, token_number, status, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING queue_id, token_number, joined_at`,
      [userId, serviceId, tokenNumber, 'waiting', 0]
    );

    const queue = result.rows[0];

    // Calculate position and ETA
    const position = await getQueuePosition(queue.queue_id);
    const estimatedWaitTime = await calculateEstimatedWaitTime(serviceId, position);
    const estimatedCallTime = new Date(
      Date.now() + estimatedWaitTime * 60000
    ).toISOString();

    // Generate QR code data
    const qrData = generateQRData(queue.queue_id, tokenNumber, userId as string);

    // Update estimated wait time in database
    await pool.query(
      'UPDATE queues SET estimated_wait_time = $1 WHERE queue_id = $2',
      [estimatedWaitTime, queue.queue_id]
    );

    // Log queue creation
    await pool.query(
      'INSERT INTO queue_logs (queue_id, status_change, notes) VALUES ($1, $2, $3)',
      [queue.queue_id, 'joined', `Token #${tokenNumber} - Position ${position}`]
    );

    // Cache queue data
    const queueData = {
      queueId: queue.queue_id,
      tokenNumber,
      position,
      estimatedWaitTime,
      status: 'waiting',
    };
    await updateQueueCache(queue.queue_id, queueData);

    res.status(201).json({
      success: true,
      message: 'Successfully joined the queue',
      data: {
        queueId: queue.queue_id,
        tokenNumber,
        position,
        estimatedWaitTime,
        estimatedCallTime,
        qrCode: qrData,
        serviceType: service.service_name,
        status: 'waiting',
        joinedAt: queue.joined_at,
      },
    });
  } catch (error) {
    console.error('Join queue error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Get Queue Status - Check current position and ETA
 */
export const getQueueStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { queueId } = req.params;

    // Get queue details
    const result = await pool.query(
      `SELECT q.queue_id, q.token_number, q.status, q.joined_at, q.called_at,
              q.counter_id, q.estimated_wait_time, s.service_name, c.counter_name
       FROM queues q
       LEFT JOIN service_types s ON q.service_id = s.service_id
       LEFT JOIN counters c ON q.counter_id = c.counter_id
       WHERE q.queue_id = $1 AND q.user_id = $2`,
      [queueId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    const queue = result.rows[0];

    // If already served or cancelled, return status
    if (['served', 'cancelled', 'no_show'].includes(queue.status)) {
      return res.json({
        success: true,
        data: {
          queueId: queue.queue_id,
          tokenNumber: queue.token_number,
          status: queue.status,
          serviceType: queue.service_name,
          completedAt: queue.called_at,
        },
      });
    }

    // Calculate current position
    const position = await getQueuePosition(queue.queue_id);
    const aheadOfYou = position - 1;

    // Recalculate ETA
    const estimatedWaitTime = await calculateEstimatedWaitTime(
      result.rows[0].service_id,
      position
    );

    // Generate fresh QR code
    const qrData = generateQRData(queue.queue_id, queue.token_number, userId as string);

    res.json({
      success: true,
      data: {
        queueId: queue.queue_id,
        tokenNumber: queue.token_number,
        position,
        aheadOfYou,
        estimatedWaitTime,
        status: queue.status,
        serviceType: queue.service_name,
        counterName: queue.counter_name,
        counterId: queue.counter_id,
        qrCode: qrData,
        joinedAt: queue.joined_at,
      },
    });
  } catch (error) {
    console.error('Get queue status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Cancel Queue - User cancels their queue
 */
export const cancelQueue = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { queueId } = req.params;

    // Check if queue exists and belongs to user
    const queueCheck = await pool.query(
      'SELECT queue_id, status, token_number FROM queues WHERE queue_id = $1 AND user_id = $2',
      [queueId, userId]
    );

    if (queueCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    const queue = queueCheck.rows[0];

    // Check if already completed
    if (['served', 'cancelled', 'no_show'].includes(queue.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel queue. Current status: ${queue.status}`,
      });
    }

    // Update queue status
    await pool.query(
      'UPDATE queues SET status = $1, completed_at = NOW() WHERE queue_id = $2',
      ['cancelled', queueId]
    );

    // Log cancellation
    await pool.query(
      'INSERT INTO queue_logs (queue_id, status_change, notes) VALUES ($1, $2, $3)',
      [queueId, 'cancelled', `User cancelled token #${queue.token_number}`]
    );

    // Clear cache
    await clearQueueCache(queueId);

    res.json({
      success: true,
      message: 'Queue cancelled successfully',
      data: {
        queueId,
        tokenNumber: queue.token_number,
        status: 'cancelled',
      },
    });
  } catch (error) {
    console.error('Cancel queue error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Get User's Queue History
 */
export const getQueueHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = 10, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT q.queue_id, q.token_number, q.status, q.joined_at, q.completed_at,
              q.estimated_wait_time, q.actual_wait_time, s.service_name, c.counter_name
       FROM queues q
       LEFT JOIN service_types s ON q.service_id = s.service_id
       LEFT JOIN counters c ON q.counter_id = c.counter_id
       WHERE q.user_id = $1
       ORDER BY q.joined_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({
      success: true,
      data: {
        queues: result.rows.map((q) => ({
          queueId: q.queue_id,
          tokenNumber: q.token_number,
          status: q.status,
          serviceType: q.service_name,
          counterName: q.counter_name,
          joinedAt: q.joined_at,
          completedAt: q.completed_at,
          estimatedWaitTime: q.estimated_wait_time,
          actualWaitTime: q.actual_wait_time,
        })),
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      },
    });
  } catch (error) {
    console.error('Get queue history error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Get Active Queue - Get user's current active queue
 */
export const getActiveQueue = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const result = await pool.query(
      `SELECT q.queue_id, q.token_number, q.status, q.joined_at,
              s.service_name, c.counter_name, q.counter_id
       FROM queues q
       LEFT JOIN service_types s ON q.service_id = s.service_id
       LEFT JOIN counters c ON q.counter_id = c.counter_id
       WHERE q.user_id = $1 AND q.status IN ('waiting', 'called', 'serving')
       ORDER BY q.joined_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No active queue found',
      });
    }

    const queue = result.rows[0];
    const position = await getQueuePosition(queue.queue_id);
    const qrData = generateQRData(queue.queue_id, queue.token_number, userId as string);

    res.json({
      success: true,
      data: {
        queueId: queue.queue_id,
        tokenNumber: queue.token_number,
        position,
        status: queue.status,
        serviceType: queue.service_name,
        counterName: queue.counter_name,
        counterId: queue.counter_id,
        qrCode: qrData,
        joinedAt: queue.joined_at,
      },
    });
  } catch (error) {
    console.error('Get active queue error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};