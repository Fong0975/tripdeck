import mysql from 'mysql2/promise';

import { createLogger } from '../logger';

const logger = createLogger('db');

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
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
