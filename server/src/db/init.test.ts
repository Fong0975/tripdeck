import { beforeEach, describe, expect, it, vi } from 'vitest';

// eslint-disable-next-line import/order -- import/order flip-flops on newlines-between for this type-only sibling import; pin it here instead of fighting --fix
import type { ColumnDef, TableDef } from './schema';

const mockPoolExecute = vi.fn();

vi.mock('../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
  },
}));

// vi.mock(...) below is hoisted above these fixtures' declarations, so the
// values it references must come from vi.hoisted(...) instead of plain
// top-level consts — otherwise the factory reads them while still in their
// temporal dead zone.
const { fooTable, barTable, bazTable } = vi.hoisted(() => {
  const fooTable: TableDef = {
    name: 'foo',
    columns: [
      { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
      { name: 'label', type: 'VARCHAR(50)', notNull: true, default: 'x' },
    ],
    uniqueKeys: [{ name: 'uq_foo_label', columns: ['label'] }],
    foreignKeys: [
      {
        name: 'fk_foo_bar',
        column: 'bar_id',
        references: { table: 'bar', column: 'id' },
        onDelete: 'CASCADE',
      },
    ],
  };

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
      { name: 'name', type: 'VARCHAR(255)', notNull: true },
      { name: 'extra', type: 'TEXT' },
    ],
  };

  return { fooTable, barTable, bazTable };
});

vi.mock('./schema', () => ({
  tableDefinitions: [fooTable, barTable, bazTable],
}));

// eslint-disable-next-line import/order -- must come after the vi.mock calls above so ./init resolves the mocked ./schema
import { buildColumnSql, buildCreateTableSql, initDatabase } from './init';

const EXISTING_COLUMNS: Record<string, string[]> = {
  bar: ['id', 'count'],
  baz: ['id', 'name'],
};

function setUpInitDatabaseMock(): void {
  mockPoolExecute.mockImplementation((sql: string, params?: unknown[]) => {
    if (sql.includes('SELECT DATABASE()')) {
      return Promise.resolve([[{ db: 'test_db' }]]);
    }
    if (sql.includes('information_schema.TABLES')) {
      const tableName = params?.[1] as string;
      const exists = tableName in EXISTING_COLUMNS;
      return Promise.resolve([exists ? [{ TABLE_NAME: tableName }] : []]);
    }
    if (sql.includes('information_schema.COLUMNS')) {
      const tableName = params?.[1] as string;
      const columns = EXISTING_COLUMNS[tableName] ?? [];
      return Promise.resolve([columns.map(c => ({ COLUMN_NAME: c }))]);
    }
    return Promise.resolve([{}]);
  });
}

describe('db/init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildColumnSql', () => {
    const cases: Array<{ name: string; col: ColumnDef; expected: string }> = [
      {
        name: 'plain column with no attributes',
        col: { name: 'title', type: 'VARCHAR(255)' },
        expected: 'title VARCHAR(255)',
      },
      {
        name: 'NOT NULL',
        col: { name: 'title', type: 'VARCHAR(255)', notNull: true },
        expected: 'title VARCHAR(255) NOT NULL',
      },
      {
        name: 'string DEFAULT (quoted)',
        col: { name: 'status', type: 'VARCHAR(20)', default: 'pending' },
        expected: "status VARCHAR(20) DEFAULT 'pending'",
      },
      {
        name: 'numeric DEFAULT (unquoted)',
        col: { name: 'sort_order', type: 'INT', default: 0 },
        expected: 'sort_order INT DEFAULT 0',
      },
      {
        name: 'AUTO_INCREMENT + PRIMARY KEY',
        col: {
          name: 'id',
          type: 'INT',
          autoIncrement: true,
          primaryKey: true,
        },
        expected: 'id INT AUTO_INCREMENT PRIMARY KEY',
      },
      {
        name: 'NOT NULL + numeric DEFAULT combined',
        col: {
          name: 'checked',
          type: 'TINYINT(1)',
          notNull: true,
          default: 0,
        },
        expected: 'checked TINYINT(1) NOT NULL DEFAULT 0',
      },
    ];

    it.each(cases)('builds SQL for $name', ({ col, expected }) => {
      expect(buildColumnSql(col)).toBe(expected);
    });
  });

  describe('buildCreateTableSql', () => {
    it('builds a CREATE TABLE statement without uniqueKeys or foreignKeys', () => {
      const sql = buildCreateTableSql(barTable);
      expect(sql).toBe(
        'CREATE TABLE IF NOT EXISTS bar (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  count INT NOT NULL DEFAULT 0\n)',
      );
    });

    it('includes UNIQUE KEY and FOREIGN KEY (with ON DELETE) clauses when present', () => {
      const sql = buildCreateTableSql(fooTable);
      expect(sql).toContain('UNIQUE KEY uq_foo_label (label)');
      expect(sql).toContain(
        'CONSTRAINT fk_foo_bar FOREIGN KEY (bar_id) REFERENCES bar(id) ON DELETE CASCADE',
      );
    });

    it('omits ON DELETE when the foreign key does not specify one', () => {
      const table: TableDef = {
        name: 'qux',
        columns: [{ name: 'id', type: 'INT', primaryKey: true }],
        foreignKeys: [
          {
            name: 'fk_qux_bar',
            column: 'bar_id',
            references: { table: 'bar', column: 'id' },
          },
        ],
      };
      const sql = buildCreateTableSql(table);
      expect(sql).toContain(
        'CONSTRAINT fk_qux_bar FOREIGN KEY (bar_id) REFERENCES bar(id)',
      );
      expect(sql).not.toContain('ON DELETE');
    });
  });

  describe('initDatabase', () => {
    it('creates a table that does not exist yet', async () => {
      setUpInitDatabaseMock();

      await initDatabase();

      const createCalls = mockPoolExecute.mock.calls.filter(([sql]) =>
        (sql as string).startsWith('CREATE TABLE'),
      );
      expect(createCalls).toHaveLength(1);
      expect(createCalls[0][0]).toContain('CREATE TABLE IF NOT EXISTS foo');
    });

    it('does not issue ALTER TABLE for an existing table with no missing columns', async () => {
      setUpInitDatabaseMock();

      await initDatabase();

      const barAlterCalls = mockPoolExecute.mock.calls.filter(([sql]) =>
        (sql as string).includes('ALTER TABLE bar'),
      );
      expect(barAlterCalls).toHaveLength(0);
    });

    it('adds missing columns to an existing table via ALTER TABLE ADD COLUMN', async () => {
      setUpInitDatabaseMock();

      await initDatabase();

      const bazAlterCalls = mockPoolExecute.mock.calls.filter(([sql]) =>
        (sql as string).includes('ALTER TABLE baz'),
      );
      expect(bazAlterCalls).toHaveLength(1);
      expect(bazAlterCalls[0][0]).toBe('ALTER TABLE baz ADD COLUMN extra TEXT');
    });
  });
});
