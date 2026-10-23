import mysql from 'mysql2/promise';

import { createLogger } from '../logger';

import { readSecret } from './secrets';

const logger = createLogger('db');

/**
 * Resolves DB_PASSWORD (Docker secret file first, then the plain env var).
 * An unreadable secret file is logged and treated as an empty password, so
 * the server still starts and the resulting MySQL auth failure surfaces
 * through the regular startup error path instead of an unlogged crash.
 */
function readDbPassword(): string {
  try {
    return readSecret('DB_PASSWORD');
  } catch (err) {
    logger.error('Failed to load DB_PASSWORD secret', undefined, err);
    return '';
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: readDbPassword(),
  database: process.env.DB_NAME ?? 'tripdeck',
  waitForConnections: true,
  connectionLimit: 10,
});

// mysql2/promise's Pool type only exposes 'connection'/'acquire'/'release'/
// 'enqueue' events; fatal pool-level errors (e.g. the connection to MySQL
// being lost) are only emitted on the underlying callback-based pool
// (`pool.pool`), and would otherwise go completely unobserved. Deliberately
// never logs `password` — only the error's code/fatal flag.
pool.pool.on('error', (err: NodeJS.ErrnoException & { fatal?: boolean }) => {
  logger.error(
    'MySQL connection pool error',
    { code: err.code, fatal: err.fatal },
    err,
  );
});

export default pool;
