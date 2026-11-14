import { describe, expect, it } from 'vitest';

import type { ColumnDef, ForeignKeyDef, TableDef } from './schema';
import {
  buildAddColumnSql,
  buildAddForeignKeySql,
  buildAddIndexSql,
  buildColumnSql,
  buildCreateTableSql,
  buildDeleteOrphansSql,
  buildDropForeignKeySql,
  buildForeignKeyClause,
  buildIndexClause,
} from './sqlBuilders';

const cascadeFk: ForeignKeyDef = {
  name: 'fk_foo_bar',
  column: 'bar_id',
  references: { table: 'bar', column: 'id' },
  onDelete: 'CASCADE',
};

const defaultFk: ForeignKeyDef = {
  name: 'fk_qux_bar',
  column: 'bar_id',
  references: { table: 'bar', column: 'id' },
};

describe('db/sqlBuilders', () => {
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
    const cases: Array<{ name: string; def: TableDef; expected: string }> = [
      {
        name: 'columns only',
        def: {
          name: 'bar',
          columns: [
            { name: 'id', type: 'INT', autoIncrement: true, primaryKey: true },
            { name: 'count', type: 'INT', notNull: true, default: 0 },
          ],
        },
        expected:
          'CREATE TABLE IF NOT EXISTS bar (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  count INT NOT NULL DEFAULT 0\n)',
      },
      {
        name: 'unique key, index and foreign keys in that order',
        def: {
          name: 'foo',
          columns: [
            { name: 'id', type: 'INT', primaryKey: true },
            { name: 'bar_id', type: 'INT' },
          ],
          uniqueKeys: [{ name: 'uq_foo_bar', columns: ['bar_id'] }],
          indexes: [{ name: 'idx_foo_bar_id', columns: ['bar_id', 'id'] }],
          foreignKeys: [cascadeFk, defaultFk],
        },
        expected:
          'CREATE TABLE IF NOT EXISTS foo (\n' +
          '  id INT PRIMARY KEY,\n' +
          '  bar_id INT,\n' +
          '  UNIQUE KEY uq_foo_bar (bar_id),\n' +
          '  KEY idx_foo_bar_id (bar_id, id),\n' +
          '  CONSTRAINT fk_foo_bar FOREIGN KEY (bar_id) REFERENCES bar(id) ON DELETE CASCADE,\n' +
          '  CONSTRAINT fk_qux_bar FOREIGN KEY (bar_id) REFERENCES bar(id)\n' +
          ')',
      },
    ];

    it.each(cases)('builds CREATE TABLE with $name', ({ def, expected }) => {
      expect(buildCreateTableSql(def)).toBe(expected);
    });
  });

  describe('clause and ALTER builders', () => {
    const cases: Array<{
      name: string;
      actual: () => string;
      expected: string;
    }> = [
      {
        name: 'index clause',
        actual: () => buildIndexClause({ name: 'idx_a', columns: ['x', 'y'] }),
        expected: 'KEY idx_a (x, y)',
      },
      {
        name: 'FK clause with ON DELETE',
        actual: () => buildForeignKeyClause(cascadeFk),
        expected:
          'CONSTRAINT fk_foo_bar FOREIGN KEY (bar_id) REFERENCES bar(id) ON DELETE CASCADE',
      },
      {
        name: 'FK clause without ON DELETE',
        actual: () => buildForeignKeyClause(defaultFk),
        expected:
          'CONSTRAINT fk_qux_bar FOREIGN KEY (bar_id) REFERENCES bar(id)',
      },
      {
        name: 'ADD COLUMN',
        actual: () => buildAddColumnSql('baz', { name: 'extra', type: 'TEXT' }),
        expected: 'ALTER TABLE baz ADD COLUMN extra TEXT',
      },
      {
        name: 'ADD INDEX',
        actual: () =>
          buildAddIndexSql('baz', { name: 'idx_a', columns: ['x', 'y'] }),
        expected: 'ALTER TABLE baz ADD INDEX idx_a (x, y)',
      },
      {
        name: 'ADD CONSTRAINT reuses the FK clause',
        actual: () => buildAddForeignKeySql('foo', cascadeFk),
        expected:
          'ALTER TABLE foo ADD CONSTRAINT fk_foo_bar FOREIGN KEY (bar_id) REFERENCES bar(id) ON DELETE CASCADE',
      },
      {
        name: 'DROP FOREIGN KEY',
        actual: () => buildDropForeignKeySql('foo', 'fk_foo_bar'),
        expected: 'ALTER TABLE foo DROP FOREIGN KEY fk_foo_bar',
      },
      {
        name: 'orphan DELETE via LEFT JOIN',
        actual: () => buildDeleteOrphansSql('foo', cascadeFk),
        expected:
          'DELETE c FROM foo c LEFT JOIN bar p ON c.bar_id = p.id WHERE c.bar_id IS NOT NULL AND p.id IS NULL',
      },
    ];

    it.each(cases)('builds $name', ({ actual, expected }) => {
      expect(actual()).toBe(expected);
    });
  });
});
