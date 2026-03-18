import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../types';
import { verifyQRData } from '../utils/qrCode';
import { clearQueueCache } from '../services/queueService';

/**
* Get All Active Queues (Admin Dashboard)
*/
export const getAllQueues = async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'waiting' } = req.query;

    // Handle comma-separated status or single status
    const statusArray = typeof status === 'string' ? status.split(',') : (Array.isArray(status) ? status : [status]);

    const result = await pool.query(
      `SELECT q.queue_id, q.token_number, q.status, q.joined_at, q.called_at,
              q.counter_id, q.priority, u.name as user_name, u.phone as user_phone,
              s.service_name, c.counter_name
       FROM queues q
       LEFT JOIN users u ON q.user_id = u.user_id
       LEFT JOIN service_types s ON q.service_id = s.service_id
       LEFT JOIN counters c ON q.counter_id = c.counter_id
       WHERE q.status = ANY($1::text[])
       ORDER BY q.priority DESC, q.joined_at ASC`,
      [statusArray]
    );

    res.json({
      success: true,
      data: {
        queues: result.rows.map((q) => ({
          queueId: q.queue_id,
          tokenNumber: q.token_number,
          status: q.status,
          priority: q.priority,
          userName: q.user_name,
          userPhone: q.user_phone,
          serviceName: q.service_name,
          counterName: q.counter_name,
          counterId: q.counter_id,
          joinedAt: q.joined_at,
          calledAt: q.called_at,
        })),
        count: result.rows.length,
      },
    });
  } catch (error) {
    console.error('Get all queues error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Serve Next Customer (Manual)
 */
export const serveNext = async (req: AuthRequest, res: Response) => {
  try {
    const { counterId } = req.body;
    const staffId = req.user?.id;

    if (!counterId) {
      return res.status(400).json({
        success: false,
        error: 'Counter ID is required',
      });
    }

    // Check if counter exists and is available
    const counterCheck = await pool.query(
      "SELECT counter_id, counter_name, status, service_id FROM counters WHERE counter_id = $1 AND is_active = true",
      [counterId]
    );

    if (counterCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Counter not found or inactive',
      });
    }

    const mappedServiceId = counterCheck.rows[0].service_id;

    // Get next waiting queue for this specifically assigned service (priority first, then FIFO)
    const nextQueue = await pool.query(
      `SELECT q.queue_id, q.token_number, q.user_id, u.name as user_name,
              u.phone as user_phone, s.service_name
       FROM queues q
       LEFT JOIN users u ON q.user_id = u.user_id
       LEFT JOIN service_types s ON q.service_id = s.service_id
       WHERE q.status = 'waiting'
       ${mappedServiceId ? 'AND q.service_id = $1' : ''}
       ORDER BY q.priority DESC, q.joined_at ASC
       LIMIT 1`,
       mappedServiceId ? [mappedServiceId] : []
    );

    if (nextQueue.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No customers in queue',
      });
    }

    const queue = nextQueue.rows[0];

    // Update queue status to serving
    await pool.query(
      `UPDATE queues
       SET status = $1, counter_id = $2, called_at = NOW(), serving_at = NOW()
       WHERE queue_id = $3`,
      ['serving', counterId, queue.queue_id]
    );

    // Update counter status
    await pool.query(
      "UPDATE counters SET status = $1, current_queue_id = $2 WHERE counter_id = $3",
      ['occupied', queue.queue_id, counterId]
    );

    // Log the action
    await pool.query(
      'INSERT INTO queue_logs (queue_id, counter_id, status_change, notes) VALUES ($1, $2, $3, $4)',
      [queue.queue_id, counterId, 'serving', `Served by staff at counter ${counterId}`]
    );

    // Clear cache
    await clearQueueCache(queue.queue_id);

    res.json({
      success: true,
      message: 'Customer called to counter',
      data: {
        queueId: queue.queue_id,
        tokenNumber: queue.token_number,
        userName: queue.user_name,
        userPhone: queue.user_phone,
        serviceType: queue.service_name,
        counterId,
        status: 'serving',
      },
    });
  } catch (error) {
    console.error('Serve next error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Scan QR Code to Serve (Admin scans customer's QR)
 */
export const scanQRToServe = async (req: AuthRequest, res: Response) => {
  try {
    const { qrData, counterId } = req.body;
    const staffId = req.user?.id;

    if (!qrData || !counterId) {
      return res.status(400).json({
        success: false,
        error: 'QR data and Counter ID are required',
      });
    }

    // Verify QR code
    const decodedQR = verifyQRData(qrData);
    if (!decodedQR) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired QR code',
      });
    }

    // Check if queue exists
    const queueCheck = await pool.query(
      `SELECT q.queue_id, q.token_number, q.status, q.user_id, q.joined_at,
              u.name as user_name, u.phone as user_phone, s.service_name
       FROM queues q
       LEFT JOIN users u ON q.user_id = u.user_id
       LEFT JOIN service_types s ON q.service_id = s.service_id
       WHERE q.queue_id = $1`,
      [decodedQR.queueId]
    );

    if (queueCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    const queue = queueCheck.rows[0];

    // Check if already served
    if (queue.status === 'served') {
      return res.status(400).json({
        success: false,
        error: 'Customer already served',
        data: { status: 'served' },
      });
    }

    // Check if cancelled
    if (queue.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Queue was cancelled by user',
      });
    }

    // Update queue to serving/served
    const completedAt = new Date();
    const actualWaitTime = Math.floor(
      (completedAt.getTime() - new Date(queue.joined_at).getTime()) / 60000
    );

    await pool.query(
      `UPDATE queues
       SET status = $1, counter_id = $2, called_at = NOW(),
           serving_at = NOW(), completed_at = NOW(), actual_wait_time = $3
       WHERE queue_id = $4`,
      ['served', counterId, actualWaitTime, decodedQR.queueId]
    );

    // Update counter
    await pool.query(
      "UPDATE counters SET status = $1, current_queue_id = NULL WHERE counter_id = $2",
      ['free', counterId]
    );

    // Log action
    await pool.query(
      'INSERT INTO queue_logs (queue_id, counter_id, status_change, notes) VALUES ($1, $2, $3, $4)',
      [
        decodedQR.queueId,
        counterId,
        'served',
        `QR scanned and served at counter ${counterId}`,
      ]
    );

    // Clear cache
    await clearQueueCache(decodedQR.queueId);

    res.json({
      success: true,
      message: 'Customer served successfully via QR scan',
      data: {
        queueId: queue.queue_id,
        tokenNumber: queue.token_number,
        userName: queue.user_name,
        userPhone: queue.user_phone,
        serviceType: queue.service_name,
        counterId,
        status: 'served',
        actualWaitTime,
      },
    });
  } catch (error) {
    console.error('Scan QR to serve error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Mark Queue as Served (Manual completion after serving)
 */
export const markAsServed = async (req: AuthRequest, res: Response) => {
  try {
    const { queueId } = req.params;
    const { notes } = req.body;

    // Get queue details
    const queueCheck = await pool.query(
      'SELECT queue_id, status, token_number, joined_at, counter_id FROM queues WHERE queue_id = $1',
      [queueId]
    );

    if (queueCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    const queue = queueCheck.rows[0];

    if (queue.status === 'served') {
      return res.status(400).json({
        success: false,
        error: 'Queue already marked as served',
      });
    }

    // Calculate actual wait time
    const completedAt = new Date();
    const actualWaitTime = Math.floor(
      (completedAt.getTime() - new Date(queue.joined_at).getTime()) / 60000
    );

    // Update queue
    await pool.query(
      `UPDATE queues
       SET status = $1, completed_at = NOW(), actual_wait_time = $2, notes = $3
       WHERE queue_id = $4`,
      ['served', actualWaitTime, notes || null, queueId]
    );

    // Free up counter
    if (queue.counter_id) {
      await pool.query(
        "UPDATE counters SET status = $1, current_queue_id = NULL WHERE counter_id = $2",
        ['free', queue.counter_id]
      );
    }

    // Log action
    await pool.query(
      'INSERT INTO queue_logs (queue_id, counter_id, status_change, notes) VALUES ($1, $2, $3, $4)',
      [queueId, queue.counter_id, 'served', notes || 'Marked as served']
    );

    // Clear cache
    await clearQueueCache(queueId);

    res.json({
      success: true,
      message: 'Queue marked as served',
      data: {
        queueId,
        tokenNumber: queue.token_number,
        status: 'served',
        actualWaitTime,
      },
    });
  } catch (error) {
    console.error('Mark as served error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Mark Queue as No-Show
 */
export const markAsNoShow = async (req: AuthRequest, res: Response) => {
  try {
    const { queueId } = req.params;

    const queueCheck = await pool.query(
      'SELECT queue_id, status, token_number FROM queues WHERE queue_id = $1',
      [queueId]
    );

    if (queueCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    const queue = queueCheck.rows[0];

    await pool.query(
      "UPDATE queues SET status = $1, completed_at = NOW() WHERE queue_id = $2",
      ['no_show', queueId]
    );

    await pool.query(
      'INSERT INTO queue_logs (queue_id, status_change, notes) VALUES ($1, $2, $3)',
      [queueId, 'no_show', `Token #${queue.token_number} marked as no-show`]
    );

    await clearQueueCache(queueId);

    res.json({
      success: true,
      message: 'Queue marked as no-show',
      data: {
        queueId,
        tokenNumber: queue.token_number,
        status: 'no_show',
      },
    });
  } catch (error) {
    console.error('Mark as no-show error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Get Counter Status
 */
export const getCounterStatus = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT c.counter_id, c.counter_name, c.status, c.current_queue_id,
              q.token_number, u.name as user_name, s.service_name
       FROM counters c
       LEFT JOIN queues q ON c.current_queue_id = q.queue_id
       LEFT JOIN users u ON q.user_id = u.user_id
       LEFT JOIN service_types s ON q.service_id = s.service_id
       WHERE c.is_active = true
       ORDER BY c.counter_id`
    );

    res.json({
      success: true,
      data: {
        counters: result.rows.map((c) => ({
          counterId: c.counter_id,
          counterName: c.counter_name,
          status: c.status,
          currentQueue: c.current_queue_id
            ? {
              queueId: c.current_queue_id,
              tokenNumber: c.token_number,
              userName: c.user_name,
              serviceType: c.service_name,
            }
            : null,
        })),
      },
    });
  } catch (error) {
    console.error('Get counter status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Update Counter Status (Pause/Resume)
 */
export const updateCounterStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { counterId } = req.params;
    const { status } = req.body;

    if (!['free', 'occupied', 'paused'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: free, occupied, or paused',
      });
    }

    const result = await pool.query(
      'UPDATE counters SET status = $1 WHERE counter_id = $2 AND is_active = true RETURNING counter_id, counter_name, status',
      [status, counterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Counter not found',
      });
    }

    res.json({
      success: true,
      message: 'Counter status updated',
      data: {
        counterId: result.rows[0].counter_id,
        counterName: result.rows[0].counter_name,
        status: result.rows[0].status,
      },
    });
  } catch (error) {
    console.error('Update counter status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Get Queue Analytics
 */
export const getQueueAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    // Total queues today
    const totalResult = await pool.query(
      `SELECT COUNT(*) as total FROM queues WHERE DATE(joined_at) = $1`,
      [date]
    );

    // Status breakdown
    const statusResult = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM queues
       WHERE DATE(joined_at) = $1
       GROUP BY status`,
      [date]
    );

    // Average wait time
    const avgWaitResult = await pool.query(
      `SELECT AVG(actual_wait_time) as avg_wait
       FROM queues
       WHERE DATE(joined_at) = $1 AND actual_wait_time IS NOT NULL`,
      [date]
    );

    // Currently waiting
    const waitingResult = await pool.query(
      "SELECT COUNT(*) as count FROM queues WHERE status = 'waiting'"
    );

    const breakdown = statusResult.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {} as any);

    res.json({
      success: true,
      data: {
        date,
        totalQueues: parseInt(totalResult.rows[0].total),
        currentlyWaiting: parseInt(waitingResult.rows[0].count),
        servedToday: breakdown['served'] || 0,
        noShowToday: breakdown['no_show'] || 0,
        avgWaitTime: Math.round(parseFloat(avgWaitResult.rows[0].avg_wait) || 0),
        statusBreakdown: breakdown,
      },
    });
  } catch (error) {
    console.error('Get queue analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};