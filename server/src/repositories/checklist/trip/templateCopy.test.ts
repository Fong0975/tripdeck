import type { PoolConnection } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../logger', async () => {
  const { mockLogger } = await import('../../../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import { db } from '../../../test-utils/dbMocks';

import { copyTemplateIntoTrip } from './templateCopy';

const { execute: mockConnExecute, query: mockConnQuery } = db.conn;
const conn = db.conn as unknown as PoolConnection;

const INSERT_SPECS_SQL =
  'INSERT INTO checklist_trip_item_specs (checklist_trip_item_id, name, storage_location) VALUES ?';

interface TemplateRows {
  categories: Array<{ id: number; name: string }>;
  items: Array<{
    id: number;
    checklist_template_category_id: number;
    name: string;
    quantity: number | null;
    notes: string | null;
    storage_location: string | null;
  }>;
  specs: Array<{
    id: number;
    checklist_template_item_id: number;
    name: string;
    storage_location: string | null;
  }>;
}

/**
 * Serves the template rows for the three SELECTs and hands out increasing
 * insert ids (categories from 500, items from 600).
 */
function mockTemplate(rows: TemplateRows): void {
  let nextCategoryId = 500;
  let nextItemId = 600;
  mockConnExecute.mockImplementation((sql: string) => {
    if (sql.startsWith('SELECT * FROM checklist_template_categories')) {
      return Promise.resolve([rows.categories]);
    }
    if (sql.startsWith('SELECT * FROM checklist_template_items')) {
      return Promise.resolve([rows.items]);
    }
    if (sql.startsWith('SELECT * FROM checklist_template_item_specs')) {
      return Promise.resolve([rows.specs]);
    }
    if (sql.startsWith('INSERT INTO checklist_trip_categories')) {
      return Promise.resolve([{ insertId: nextCategoryId++ }]);
    }
    if (sql.startsWith('INSERT INTO checklist_trip_items')) {
      return Promise.resolve([{ insertId: nextItemId++ }]);
    }
    return Promise.resolve([[]]);
  });
  mockConnQuery.mockResolvedValue([{ affectedRows: 1 }]);
}

function item(id: number, categoryId: number, name: string) {
  return {
    id,
    checklist_template_category_id: categoryId,
    name,
    quantity: 1,
    notes: null,
    storage_location: null,
  };
}

function spec(id: number, itemId: number, name: string) {
  return {
    id,
    checklist_template_item_id: itemId,
    name,
    storage_location: null,
  };
}

function selectCount(): number {
  return mockConnExecute.mock.calls.filter(([sql]) =>
    String(sql).startsWith('SELECT'),
  ).length;
}

describe('copyTemplateIntoTrip', () => {
  it.each([
    {
      name: 'an empty template',
      rows: { categories: [], items: [], specs: [] },
      expectedCount: 0,
      expectedSelects: 1,
      expectedItemInserts: [],
      expectedSpecRows: null,
    },
    {
      name: 'categories without items',
      rows: {
        categories: [
          { id: 1, name: 'Clothes' },
          { id: 2, name: 'Docs' },
        ],
        items: [],
        specs: [],
      },
      expectedCount: 2,
      expectedSelects: 3,
      expectedItemInserts: [],
      expectedSpecRows: null,
    },
    {
      name: 'several categories, items and specs',
      rows: {
        categories: [
          { id: 1, name: 'Clothes' },
          { id: 2, name: 'Docs' },
        ],
        items: [
          item(11, 1, 'Jacket'),
          item(12, 1, 'Socks'),
          item(21, 2, 'Passport'),
        ],
        specs: [
          spec(111, 11, 'Waterproof'),
          spec(112, 11, 'Size M'),
          spec(211, 21, 'Copy'),
        ],
      },
      expectedCount: 2,
      expectedSelects: 3,
      expectedItemInserts: [
        [500, 'Jacket', 1, null, null, 0],
        [500, 'Socks', 1, null, null, 1],
        [501, 'Passport', 1, null, null, 0],
      ],
      expectedSpecRows: [
        [600, 'Waterproof', null],
        [600, 'Size M', null],
        [602, 'Copy', null],
      ],
    },
  ])(
    'loads the template once and batches specs for $name',
    async ({
      rows,
      expectedCount,
      expectedSelects,
      expectedItemInserts,
      expectedSpecRows,
    }) => {
      mockTemplate(rows);

      const count = await copyTemplateIntoTrip(conn, 5);

      expect(count).toBe(expectedCount);
      expect(selectCount()).toBe(expectedSelects);
      const itemInserts = mockConnExecute.mock.calls
        .filter(([sql]) =>
          String(sql).startsWith('INSERT INTO checklist_trip_items'),
        )
        .map(([, params]) => params);
      expect(itemInserts).toEqual(expectedItemInserts);
      if (expectedSpecRows === null) {
        expect(mockConnQuery).not.toHaveBeenCalled();
      } else {
        expect(mockConnQuery).toHaveBeenCalledTimes(1);
        expect(mockConnQuery).toHaveBeenCalledWith(INSERT_SPECS_SQL, [
          expectedSpecRows,
        ]);
      }
    },
  );

  it('inserts each category under the trip in template order', async () => {
    mockTemplate({
      categories: [
        { id: 1, name: 'Clothes' },
        { id: 2, name: 'Docs' },
      ],
      items: [],
      specs: [],
    });

    await copyTemplateIntoTrip(conn, 5);

    const categoryInserts = mockConnExecute.mock.calls
      .filter(([sql]) =>
        String(sql).startsWith('INSERT INTO checklist_trip_categories'),
      )
      .map(([, params]) => params);
    expect(categoryInserts).toEqual([
      [5, 'Clothes', 0],
      [5, 'Docs', 1],
    ]);
  });
});
