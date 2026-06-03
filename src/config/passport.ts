import { isGoogleOAuthEnabled } from './env.js';
import { logger } from './logger.js';

export function configurePassport(): void {
  if (!isGoogleOAuthEnabled) {
    logger.debug('Google OAuth not configured — skipping passport setup');
    return;
  }
  logger.info('Google OAuth enabled');
}
