import 'dotenv/config';

import express from 'express';

import { initDatabase } from './db/init';
import apiRoutes from './routes';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(express.json());
app.use('/api', apiRoutes);

/**
 * Initializes the database before accepting requests, ensuring all tables
 * exist by the time the first connection arrives.
 */
async function start(): Promise<void> {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`[server] Running on http://localhost:${PORT}`);
  });
}

// Catch startup failures explicitly so the process exits with a non-zero
// code instead of hanging with an unhandled rejection warning.
start().catch(err => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
