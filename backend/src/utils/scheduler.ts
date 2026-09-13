import cron from 'node-cron';
import { logger } from './logger.js';
import {
  expireStaleRequests,
  cancelAllPendingCravings,
} from '../modules/requests/requests.service.js';

/**
 * Start all background cron jobs.
 * Call once after the HTTP server is listening.
 */
export function startScheduler(): void {
  // ── Every-minute sweep: expire any request past its expires_at ──
  cron.schedule('* * * * *', async () => {
    try {
      const count = await expireStaleRequests();
      if (count > 0) {
        logger.info({ count }, 'Auto-expired stale requests');
      }
    } catch (err) {
      logger.error({ err }, 'Scheduled expire-sweep failed');
    }
  });

  // ── 8:00 AM IST daily: cancel ALL pending late-night cravings ──
  cron.schedule(
    '0 8 * * *',
    async () => {
      try {
        const count = await cancelAllPendingCravings();
        logger.info({ count }, '8 AM sweep — cancelled remaining late-night cravings');
      } catch (err) {
        logger.error({ err }, '8 AM craving sweep failed');
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  logger.info('Scheduler started (expire-sweep: every min, craving cutoff: 8 AM IST)');
}
