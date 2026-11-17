import type { ChecklistTemplate } from '@tripdeck/shared';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/database', async () => {
  const { db } = await import('../../test-utils/dbMocks');
  return db.module;
});

vi.mock('../../logger', async () => {
  const { mockLogger } = await import('../../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import { db } from '../../test-utils/dbMocks';
import { mockLogger } from '../../test-utils/loggerMock';

import { restoreTemplate } from './templateRestore';

const {
  execute: mockConnExecute,
  query: mockConnQuery,
  commit: mockConnCommit,
  rollback: mockConnRollback,
  release: mockConnRelease,
} = db.conn;

/**
 * Assigns fresh insertIds to the category/item inserts, so tests can assert
 * later inserts (items, specs) use the *new* ids.
 */
function mockSequentialInserts() {
  let nextCategoryId = 7000;
  let nextItemId = 8000;
  mockConnExecute.mockImplementation((sql: string) => {
    if (sql.startsWith('INSERT INTO checklist_template_categories')) {
      return Promise.resolve([{ insertId: nextCategoryId++ }]);
    }
    if (sql.startsWith('INSERT INTO checklist_template_items')) {
      return Promise.resolve([{ insertId: nextItemId++ }]);
    }
    return Promise.resolve([{ affectedRows: 1 }]);
  });
  mockConnQuery.mockResolvedValue([{ affectedRows: 1 }]);
}

const INSERT_SPECS_SQL =
  'INSERT INTO checklist_template_item_specs (checklist_template_item_id, name, storage_location) VALUES ?';

const passport = {
  id: 1,
  name: 'Passport',
  quantity: 1,
  notes: null,
  storage_location: null,
};

const sampleTemplate: ChecklistTemplate = {
  categories: [
    {
      id: 1,
      name: 'Documents',
      items: [
        {
          ...passport,
          specs: [{ id: 1, name: 'Size M', storage_location: null }],
        },
      ],
    },
  ],
};

describe('restoreTemplate', () => {
  it('clears the existing template and re-inserts categories, items, and specs with remapped ids', async () => {
    mockSequentialInserts();

    await restoreTemplate(sampleTemplate);

    expect(mockConnExecute).toHaveBeenCalledWith(
      'DELETE FROM checklist_template_categories',
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      'INSERT INTO checklist_template_categories (name, sort_order) VALUES (?, ?)',
      ['Documents', 0],
    );
    expect(mockConnExecute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO checklist_template_items'),
      [7000, 'Passport', 1, null, null, 0],
    );
    expect(mockConnQuery).toHaveBeenCalledWith(INSERT_SPECS_SQL, [
      [[8000, 'Size M', null]],
    ]);
    expect(mockConnCommit).toHaveBeenCalled();
    expect(mockConnRollback).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'a template with no specs',
      template: {
        categories: [
          {
            id: 1,
            name: 'Documents',
            items: [{ ...passport, specs: [] }],
          },
        ],
      },
      expectedSpecRows: null,
    },
    {
      name: 'specs spread over several categories and items',
      template: {
        categories: [
          {
            id: 1,
            name: 'Documents',
            items: [
              {
                ...passport,
                specs: [
                  { id: 1, name: 'Original', storage_location: null },
                  { id: 2, name: 'Copy', storage_location: 'Bag' },
                ],
              },
            ],
          },
          {
            id: 2,
            name: 'Clothes',
            items: [
              {
                ...passport,
                id: 2,
                name: 'Jacket',
                specs: [{ id: 3, name: 'Size M', storage_location: null }],
              },
            ],
          },
        ],
      },
      expectedSpecRows: [
        [8000, 'Original', null],
        [8000, 'Copy', 'Bag'],
        [8001, 'Size M', null],
      ],
    },
  ])(
    'inserts every spec in one batched statement for $name',
    async ({ template, expectedSpecRows }) => {
      mockSequentialInserts();

      await restoreTemplate(template);

      if (expectedSpecRows === null) {
        expect(mockConnQuery).not.toHaveBeenCalled();
      } else {
        expect(mockConnQuery).toHaveBeenCalledTimes(1);
        expect(mockConnQuery).toHaveBeenCalledWith(INSERT_SPECS_SQL, [
          expectedSpecRows,
        ]);
      }
      expect(mockConnCommit).toHaveBeenCalled();
    },
  );

  it('rolls back and rethrows when an insert fails', async () => {
    mockConnExecute.mockImplementation((sql: string) => {
      if (sql.startsWith('INSERT INTO checklist_template_categories')) {
        return Promise.reject(new Error('db error'));
      }
      return Promise.resolve([{ affectedRows: 1 }]);
    });

    await expect(restoreTemplate(sampleTemplate)).rejects.toThrow('db error');

    expect(mockConnRollback).toHaveBeenCalled();
    expect(mockConnCommit).not.toHaveBeenCalled();
    expect(mockConnRelease).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to restore checklist template, rolled back',
      expect.objectContaining({ incomingCategoryCount: 1 }),
      expect.any(Error),
    );
  });

  it('writes sort_order from the array position, ignoring the backup ids', async () => {
    mockSequentialInserts();
    // Ids are deliberately not ascending: the array order is the user's order.
    const template: ChecklistTemplate = {
      categories: [
        {
          id: 30,
          name: 'Third by id',
          items: [
            { ...passport, id: 9, name: 'Z', specs: [] },
            { ...passport, id: 2, name: 'A', specs: [] },
          ],
        },
        {
          id: 10,
          name: 'First by id',
          items: [{ ...passport, id: 5, name: 'M', specs: [] }],
        },
      ],
    };

    await restoreTemplate(template);

    const paramsOf = (table: string) =>
      mockConnExecute.mock.calls
        .filter(([sql]) => String(sql).startsWith(`INSERT INTO ${table}`))
        .map(([, params]) => params as unknown[]);
    expect(paramsOf('checklist_template_categories')).toEqual([
      ['Third by id', 0],
      ['First by id', 1],
    ]);
    expect(
      paramsOf('checklist_template_items').map(p => [p[0], p[1], p[5]]),
    ).toEqual([
      [7000, 'Z', 0],
      [7000, 'A', 1],
      [7001, 'M', 0],
    ]);
  });
});
