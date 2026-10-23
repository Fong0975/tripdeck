import { type Mock, vi } from 'vitest';

/** Mocked `PoolConnection` returned by `pool.getConnection()`. */
export interface DbConnectionMock {
  beginTransaction: Mock;
  execute: Mock;
  query: Mock;
  commit: Mock;
  rollback: Mock;
  release: Mock;
}

/** Mocked mysql2 `Pool` (the default export of `config/database`). */
export interface DbPoolMock {
  execute: Mock;
  query: Mock;
  getConnection: Mock;
}

export interface DbMock {
  pool: DbPoolMock;
  conn: DbConnectionMock;
  /** Module shape to return from a `vi.mock('…/config/database')` factory. */
  module: { default: DbPoolMock };
}

/**
 * Creates a mocked mysql2 pool plus the single connection that
 * `pool.getConnection()` resolves to by default.
 *
 * Deliberately does not import `config/database`, so the real pool (and
 * mysql2) is never loaded.
 */
export function createDbMock(): DbMock {
  const conn: DbConnectionMock = {
    beginTransaction: vi.fn(),
    execute: vi.fn(),
    query: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  };
  const pool: DbPoolMock = {
    execute: vi.fn(),
    query: vi.fn(),
    getConnection: vi.fn().mockResolvedValue(conn),
  };
  return { pool, conn, module: { default: pool } };
}

/**
 * Shared database mock. Each test file gets its own module registry, so this
 * is a per-file singleton. Wire it up with:
 *
 * ```ts
 * vi.mock('../../config/database', async () =>
 *   (await import('../../test-utils/dbMocks')).db.module,
 * );
 * import { db } from '../../test-utils/dbMocks';
 * ```
 */
export const db = createDbMock();

/** Matches a SQL string by substring, regular expression or predicate. */
export type SqlMatcher = string | RegExp | ((sql: string) => boolean);

function matchesSql(matcher: SqlMatcher, sql: string): boolean {
  if (typeof matcher === 'string') {
    return sql.includes(matcher);
  }
  if (matcher instanceof RegExp) {
    return matcher.test(sql);
  }
  return matcher(sql);
}

/**
 * Installs an implementation on an `execute`/`query` mock that resolves to
 * the result of the first route whose matcher accepts the SQL, or to
 * `fallback` when none does.
 *
 * @param mock - The mocked `execute`/`query` function.
 * @param routes - `[matcher, result]` pairs, checked in order.
 * @param fallback - Result for SQL that no route matches.
 */
export function routeSql(
  mock: Mock,
  routes: Array<[match: SqlMatcher, result: unknown]>,
  fallback?: unknown,
): void {
  mock.mockImplementation((sql: string) => {
    const route = routes.find(([match]) => matchesSql(match, sql));
    return Promise.resolve(route ? route[1] : fallback);
  });
}

/** Returns whether `sql` is a SELECT statement that mentions `table`. */
export function isSelectFrom(sql: unknown, table: string): boolean {
  return (
    (sql as string).trim().startsWith('SELECT') &&
    (sql as string).includes(table)
  );
}
