import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { configurePassport } from './config/passport.js';
import { startCronJobs } from './services/cron.service.js';
import { initSockets } from './sockets/index.js';
import { logger } from './config/logger.js';

async function main(): Promise<void> {
  configurePassport();
  await connectDb();
  startCronJobs();

  const server = http.createServer(app);
  initSockets(server);

  server.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('Failed to start server', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
