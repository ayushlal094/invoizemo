import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import app from './app.js';

// Import passport config to register strategies (side-effect import)
import { configurePassport } from './config/passport.js';
configurePassport();

async function main() {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

main().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
