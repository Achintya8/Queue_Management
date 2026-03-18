import { pool } from '../config/database';
import redis from '../config/redis';

/**
* Get next token number for today
*/
export const getNextTokenNumber = async (): Promise<number> => {
const result = await pool.query('SELECT get_next_token() as token');
return result.rows[0].token;
};

/**
* Calculate estimated wait time
*/
export const calculateEstimatedWaitTime = async (
serviceId: number,
position: number
): Promise<number> => {
// Get average service time for this service type
const serviceResult = await pool.query(
'SELECT avg_service_time FROM service_types WHERE service_id = $1',
[serviceId]
);

const avgServiceTime = serviceResult.rows[0]?.avg_service_time || 10;

// Get number of active counters
const counterResult = await pool.query(
"SELECT COUNT(*) as count FROM counters WHERE is_active = true AND status != 'paused'"
  );

  const activeCounters = Math.max(parseInt(counterResult.rows[0].count), 1);

  // Calculate ETA: (position * avg_service_time) / active_counters
  const estimatedMinutes = Math.ceil((position * avgServiceTime) / activeCounters);

  return estimatedMinutes;
};

/**
 * Get queue position for a user
 */
export const getQueuePosition = async (queueId: string): Promise<number> => {
  const result = await pool.query(
    `SELECT COUNT(*) as position
     FROM queues
     WHERE status = 'waiting'
     AND joined_at <= (SELECT joined_at FROM queues WHERE queue_id = $1)
     AND queue_id != $1`,
    [queueId]
  );

  return parseInt(result.rows[0].position) + 1;
};

/**
 * Get waiting queues count ahead of current queue
 */
export const getWaitingCount = async (joinedAt: Date): Promise<number> => {
  const result = await pool.query(
    `SELECT COUNT(*) as count
     FROM queues
     WHERE status = 'waiting'
     AND joined_at < $1`,
    [joinedAt]
  );

  return parseInt(result.rows[0].count);
};

/**
 * Update queue cache in Redis
 */
export const updateQueueCache = async (queueId: string, data: any) => {
  await redis.setex(`queue:${queueId}`, 3600, JSON.stringify(data));
};

/**
 * Get queue from cache
 */
export const getQueueFromCache = async (queueId: string) => {
  const cached = await redis.get(`queue:${queueId}`);
  return cached ? JSON.parse(cached) : null;
};

/**
 * Clear queue cache
 */
export const clearQueueCache = async (queueId: string) => {
  await redis.del(`queue:${queueId}`);
};