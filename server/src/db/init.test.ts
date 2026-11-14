import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../test-utils/dbMocks';
import { mockLogger } from '../test-utils/loggerMock';

// eslint-disable-next-line import/order -- import/order flip-flops on newlines-between for this type-only sibling import; pin it here instead of fighting --fix
import type { TableDef } from './schema';

vi.mock('../config/database', async () => {
  const { db } = await import('../test-utils/dbMocks');
  return db.module;
});

vi.mock('../logger', async () => {
  const { mockLogger } = await import('../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

const mockPoolExecute = db.pool.execute;

// vi.mock(...) below is hoisted above these fixtures' declarations, so the
// values it references must come from vi.hoisted(...) instead of plain
// top-level consts — otherwise the factory reads them while still in their
// temporal dead zone.
const { fooTable, barTable, bazTable } = vi.hoisted(() => {
  const barTable: TableDef = {
    name: 'bar',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'count', type: 'INT', notNull: true, default: 0 },
    ],
  };

  const bazTable: TableDef = {
    name: 'baz',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'bar_id', type: 'INT', notNull: true },
      { name: 'other_id', type: 'INT' },
      { name: 'extra', type: 'TEXT' },
    ],
    indexes: [{ name: 'idx_baz_bar_id', columns: ['bar_id', 'id'] }],
    foreignKeys: [
      {
        name: 'fk_baz_bar',
        column: 'bar_id',
        references: { table: 'bar', column: 'id' },
        onDelete: 'CASCADE',
      },
      {
        name: 'fk_baz_other',
        column: 'other_id',
        references: { table: 'bar', column: 'id' },
      },
    ],
  };

  const fooTable: TableDef = {
    name: 'foo',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'bar_id', type: 'INT' },
    ],
    indexes: [{ name: 'idx_foo_bar', columns: ['bar_id'] }],
    foreignKeys: [
      {
        name: 'fk_foo_bar',
        column: 'bar_id',
        references: { table: 'bar', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  };

  return { fooTable, barTable, bazTable };
});

vi.mock('./schema', () => ({
  tableDefinitions: [barTable, bazTable, fooTable],
}));

// eslint-disable-next-line import/order -- must come after the vi.mock calls above so ./init resolves the mocked ./schema
import { initDatabase } from './init';

interface LiveForeignKeyRow {
  name: string;
  deleteRule: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

interface LiveTable {
  columns: string[];
  indexes: string[];
  foreignKeys: LiveForeignKeyRow[];
}

interface LiveState {
  tables: Record<string, LiveTable>;
  orphanRows: number;
  failOn?: string;
}

function fkRow(
  name: string,
  columnName: string,
  deleteRule: string,
): LiveForeignKeyRow {
  return {
    name,
    deleteRule,
    columnName,
    referencedTable: 'bar',
    referencedColumn: 'id',
  };
}

/** Live schema where `bar` and `baz` exist but `baz` is outdated, and `foo` is missing. */
function outdatedState(): LiveState {
  return {
    tables: {
      bar: { columns: ['id', 'count'], indexes: ['PRIMARY'], foreignKeys: [] },
      baz: {
        columns: ['id', 'bar_id', 'other_id'],
        indexes: ['PRIMARY', 'fk_baz_bar'],
        foreignKeys: [fkRow('fk_baz_bar', 'bar_id', 'RESTRICT')],
      },
    },
    orphanRows: 2,
  };
}

/** Live schema fully matching the definitions. */
function alignedState(): LiveState {
  return {
    tables: {
      bar: { columns: ['id', 'count'], indexes: ['PRIMARY'], foreignKeys: [] },
      baz: {
        columns: ['id', 'bar_id', 'other_id', 'extra'],
        indexes: ['PRIMARY', 'fk_baz_bar', 'fk_baz_other', 'idx_baz_bar_id'],
        foreignKeys: [
          fkRow('fk_baz_bar', 'bar_id', 'CASCADE'),
          fkRow('fk_baz_other', 'other_id', 'NO ACTION'),
        ],
      },
      foo: {
        columns: ['id', 'bar_id'],
        indexes: ['PRIMARY', 'idx_foo_bar'],
        foreignKeys: [fkRow('fk_foo_bar', 'bar_id', 'CASCADE')],
      },
    },
    orphanRows: 0,
  };
}

function setUpLiveDatabase(state: LiveState): void {
  mockPoolExecute.mockImplementation((sql: string, params?: unknown[]) => {
    const table = state.tables[params?.[1] as string];
    if (state.failOn !== undefined && sql.includes(state.failOn)) {
      return Promise.reject(new Error('Cannot add foreign key constraint'));
    }
    if (sql.includes('SELECT DATABASE()')) {
      return Promise.resolve([[{ db: 'test_db' }]]);
    }
    if (sql.includes('information_schema.TABLES')) {
      return Promise.resolve([table ? [{ TABLE_NAME: params?.[1] }] : []]);
    }
    if (sql.includes('information_schema.COLUMNS')) {
      return Promise.resolve([
        (table?.columns ?? []).map(c => ({ COLUMN_NAME: c })),
      ]);
    }
    if (sql.includes('information_schema.STATISTICS')) {
      return Promise.resolve([
        (table?.indexes ?? []).map(i => ({ indexName: i })),
      ]);
    }
    if (sql.includes('information_schema.REFERENTIAL_CONSTRAINTS')) {
      return Promise.resolve([table?.foreignKeys ?? []]);
    }
    if (sql.startsWith('DELETE')) {
      return Promise.resolve([{ affectedRows: state.orphanRows }]);
    }
    return Promise.resolve([{ affectedRows: 0 }]);
  });
}

function mutatingStatements(): string[] {
  return mockPoolExecute.mock.calls
    .map(([sql]) => sql as string)
    .filter(sql => /^(CREATE|ALTER|DELETE)/.test(sql));
}

describe('db/init', () => {
  describe('initDatabase', () => {
    beforeEach(() => {
      mockPoolExecute.mockReset();
    });

    it.each([
      {
        name: 'aligns an outdated schema in order',
        state: outdatedState,
        expected: [
          'ALTER TABLE baz ADD COLUMN extra TEXT',
          'ALTER TABLE baz ADD INDEX idx_baz_bar_id (bar_id, id)',
          'DELETE c FROM baz c LEFT JOIN bar p ON c.bar_id = p.id WHERE c.bar_id IS NOT NULL AND p.id IS NULL',
          'ALTER TABLE baz DROP FOREIGN KEY fk_baz_bar',
          'ALTER TABLE baz ADD CONSTRAINT fk_baz_bar FOREIGN KEY (bar_id) REFERENCES bar(id) ON DELETE CASCADE',
          'ALTER TABLE baz ADD CONSTRAINT fk_baz_other FOREIGN KEY (other_id) REFERENCES bar(id)',
          'CREATE TABLE IF NOT EXISTS foo (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  bar_id INT,\n  KEY idx_foo_bar (bar_id),\n  CONSTRAINT fk_foo_bar FOREIGN KEY (bar_id) REFERENCES bar(id) ON DELETE CASCADE\n)',
        ],
      },
      {
        name: 'makes no changes when the schema is already aligned',
        state: alignedState,
        expected: [],
      },
    ])('$name', async ({ state, expected }) => {
      setUpLiveDatabase(state());

      await initDatabase();

      expect(mutatingStatements()).toEqual(expected);
    });

    it.each([
      {
        name: 'warns when orphan rows were deleted',
        orphanRows: 2,
        warned: true,
      },
      {
        name: 'stays quiet when no orphan rows exist',
        orphanRows: 0,
        warned: false,
      },
    ])('$name', async ({ orphanRows, warned }) => {
      setUpLiveDatabase({ ...outdatedState(), orphanRows });

      await initDatabase();

      const warnCalls = mockLogger.warn.mock.calls.filter(
        ([message]) =>
          message === 'Deleted orphan rows before adding foreign key',
      );
      expect(warnCalls).toHaveLength(warned ? 1 : 0);
      if (warned) {
        expect(warnCalls[0][1]).toMatchObject({
          table: 'baz',
          constraint: 'fk_baz_bar',
          deletedRows: 2,
        });
      }
    });

    it('logs and rethrows when adding a non-cascade foreign key fails', async () => {
      setUpLiveDatabase({
        ...outdatedState(),
        failOn: 'ADD CONSTRAINT fk_baz_other',
      });

      await expect(initDatabase()).rejects.toThrow(
        'Cannot add foreign key constraint',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to add foreign key'),
        expect.objectContaining({ table: 'baz', constraint: 'fk_baz_other' }),
        expect.any(Error),
      );
      expect(mutatingStatements()).not.toContainEqual(
        expect.stringContaining(
          'DELETE c FROM baz c LEFT JOIN bar p ON c.other_id',
        ),
      );
      expect(mutatingStatements()).not.toContainEqual(
        expect.stringContaining('CREATE TABLE'),
      );
    });
  });
});
