import mysql from 'mysql2/promise';

import { createLogger } from '../logger';

import { readSecretOrEmpty } from './secrets';

const logger = createLogger('db');

// An unreadable secret file yields an empty password, so the resulting MySQL
// auth failure surfaces through the regular startup error path instead of an
// unlogged crash.
const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: readSecretOrEmpty('DB_PASSWORD', logger),
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
