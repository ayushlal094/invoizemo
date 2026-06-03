import cron from 'node-cron';
import { logger } from '../config/logger.js';

let started = false;

export function startCronJobs(): void {
  if (started) return;
  started = true;

  cron.schedule('* * * * *', () => {
    logger.debug('Cron tick — overdue invoice reminders (stub)');
  });

  logger.info('Cron jobs started');
}

export function stopCronJobs(): void {
  started = false;
}
