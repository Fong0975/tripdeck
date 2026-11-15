import { describe, expect, it } from 'vitest';

import type { ForeignKeyDef, TableDef } from './schema';
import {
  findMissingColumns,
  findMissingIndexes,
  normalizeDeleteRule,
  planForeignKeyChanges,
  type ExistingForeignKey,
  type ForeignKeyChange,
} from './schemaDiff';

const fkCascade: ForeignKeyDef = {
  name: 'fk_child_parent',
  column: 'parent_id',
  references: { table: 'parent', column: 'id' },
  onDelete: 'CASCADE',
};

const fkDefault: ForeignKeyDef = {
  name: 'fk_child_other',
  column: 'other_id',
  references: { table: 'other', column: 'id' },
};

const table: TableDef = {
  name: 'child',
  columns: [
    { name: 'id', type: 'INT', primaryKey: true },
    { name: 'parent_id', type: 'INT' },
    { name: 'other_id', type: 'INT' },
  ],
  indexes: [
    { name: 'idx_a', columns: ['parent_id'] },
    { name: 'idx_b', columns: ['other_id', 'id'] },
  ],
  foreignKeys: [fkCascade, fkDefault],
};

function live(
  fk: ForeignKeyDef,
  overrides: Partial<ExistingForeignKey> = {},
): ExistingForeignKey {
  return {
    name: fk.name,
    column: fk.column,
    referencedTable: fk.references.table,
    referencedColumn: fk.references.column,
    deleteRule: fk.onDelete ?? 'NO ACTION',
    ...overrides,
  };
}

function liveMap(
  ...fks: ExistingForeignKey[]
): Map<string, ExistingForeignKey> {
  return new Map(fks.map(fk => [fk.name, fk]));
}

describe('db/schemaDiff', () => {
  describe('normalizeDeleteRule', () => {
    it.each([
      { rule: undefined, expected: 'RESTRICT' },
      { rule: 'RESTRICT', expected: 'RESTRICT' },
      { rule: 'NO ACTION', expected: 'RESTRICT' },
      { rule: 'no action', expected: 'RESTRICT' },
      { rule: 'CASCADE', expected: 'CASCADE' },
      { rule: 'SET NULL', expected: 'SET NULL' },
    ])('normalizes $rule to $expected', ({ rule, expected }) => {
      expect(normalizeDeleteRule(rule)).toBe(expected);
    });
  });

  describe('findMissingColumns', () => {
    it.each([
      {
        name: 'all present',
        existing: ['id', 'parent_id', 'other_id'],
        expected: [],
      },
      {
        name: 'one missing',
        existing: ['id', 'parent_id'],
        expected: ['other_id'],
      },
      {
        name: 'extra live columns are ignored',
        existing: ['id', 'parent_id', 'other_id', 'legacy'],
        expected: [],
      },
    ])('$name', ({ existing, expected }) => {
      const missing = findMissingColumns(table, new Set(existing));
      expect(missing.map(c => c.name)).toEqual(expected);
    });
  });

  describe('findMissingIndexes', () => {
    it.each([
      {
        name: 'none present',
        def: table,
        existing: ['PRIMARY'],
        expected: ['idx_a', 'idx_b'],
      },
      {
        name: 'one present',
        def: table,
        existing: ['PRIMARY', 'idx_b'],
        expected: ['idx_a'],
      },
      {
        name: 'all present',
        def: table,
        existing: ['idx_a', 'idx_b'],
        expected: [],
      },
      {
        name: 'table without indexes',
        def: { ...table, indexes: undefined },
        existing: [],
        expected: [],
      },
    ])('$name', ({ def, existing, expected }) => {
      const missing = findMissingIndexes(def, new Set(existing));
      expect(missing.map(i => i.name)).toEqual(expected);
    });
  });

  describe('planForeignKeyChanges', () => {
    const cases: Array<{
      name: string;
      def?: TableDef;
      existing: Map<string, ExistingForeignKey>;
      expected: ForeignKeyChange[];
    }> = [
      {
        name: 'all FKs match (default rule reported as NO ACTION)',
        existing: liveMap(live(fkCascade), live(fkDefault)),
        expected: [],
      },
      {
        name: 'default rule reported as RESTRICT still matches',
        existing: liveMap(
          live(fkCascade),
          live(fkDefault, { deleteRule: 'RESTRICT' }),
        ),
        expected: [],
      },
      {
        name: 'missing FKs are added; orphans removed only for CASCADE',
        existing: liveMap(),
        expected: [
          { fk: fkCascade, dropExisting: false, removeOrphans: true },
          { fk: fkDefault, dropExisting: false, removeOrphans: false },
        ],
      },
      {
        name: 'delete rule changed from RESTRICT to CASCADE',
        existing: liveMap(
          live(fkCascade, { deleteRule: 'RESTRICT' }),
          live(fkDefault),
        ),
        expected: [{ fk: fkCascade, dropExisting: true, removeOrphans: true }],
      },
      {
        name: 'delete rule changed from CASCADE to default',
        existing: liveMap(
          live(fkCascade),
          live(fkDefault, { deleteRule: 'CASCADE' }),
        ),
        expected: [{ fk: fkDefault, dropExisting: true, removeOrphans: false }],
      },
      {
        name: 'referenced column differs',
        existing: liveMap(
          live(fkCascade, { column: 'legacy_parent_id' }),
          live(fkDefault),
        ),
        expected: [{ fk: fkCascade, dropExisting: true, removeOrphans: true }],
      },
      {
        name: 'referenced table differs',
        existing: liveMap(
          live(fkCascade),
          live(fkDefault, { referencedTable: 'legacy_other' }),
        ),
        expected: [{ fk: fkDefault, dropExisting: true, removeOrphans: false }],
      },
      {
        name: 'live FKs absent from the definition are ignored',
        existing: liveMap(
          live(fkCascade),
          live(fkDefault),
          live({ ...fkDefault, name: 'fk_unknown' }),
        ),
        expected: [],
      },
      {
        name: 'table without foreign keys',
        def: { ...table, foreignKeys: undefined },
        existing: liveMap(live(fkCascade)),
        expected: [],
      },
    ];

    it.each(cases)('$name', ({ def, existing, expected }) => {
      expect(planForeignKeyChanges(def ?? table, existing)).toEqual(expected);
    });
  });
});
