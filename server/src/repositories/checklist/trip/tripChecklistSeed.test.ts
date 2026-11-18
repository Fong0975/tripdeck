import { describe, expect, it, vi } from 'vitest';

import { db } from '../../../test-utils/dbMocks';

import { insertDefaultOccasion, seedTripChecklist } from './tripChecklistSeed';

vi.mock('../../../config/database', async () => {
  const { db } = await import('../../../test-utils/dbMocks');
  return db.module;
});

vi.mock('../../../logger', async () => {
  const { mockLogger } = await import('../../../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

const mockConnExecute = db.conn.execute;
const mockConnQuery = db.conn.query;

const tripId = 5;
const INSERT_CATEGORY_SQL =
  'INSERT INTO checklist_trip_categories (trip_id, name, sort_order) VALUES (?, ?, ?)';
const INSERT_OCCASION_SQL =
  "INSERT INTO checklist_occasions (trip_id, name) VALUES (?, '收拾')";

/** Mocks the connection so the global template holds `categories` rows. */
function mockTemplate(categories: unknown[]) {
  mockConnExecute.mockImplementation((sql: string) => {
    if (sql.includes('checklist_template_categories')) {
      return Promise.resolve([categories]);
    }
    if (sql.includes('checklist_template_item_specs')) {
      return Promise.resolve([
        [
          {
            id: 111,
            checklist_template_item_id: 11,
            name: '防水',
            storage_location: null,
          },
        ],
      ]);
    }
    if (sql.includes('checklist_template_items')) {
      return Promise.resolve([
        [
          {
            id: 11,
            checklist_template_category_id: 1,
            name: '外套',
            quantity: 1,
            notes: null,
            storage_location: null,
          },
        ],
      ]);
    }
    if (sql.includes('INSERT INTO checklist_trip_categories')) {
      return Promise.resolve([{ insertId: 500 }]);
    }
    if (sql.includes('INSERT INTO checklist_trip_items')) {
      return Promise.resolve([{ insertId: 600 }]);
    }
    return Promise.resolve([{ insertId: 900 }]);
  });
}

describe('tripChecklistSeed', () => {
  describe('insertDefaultOccasion', () => {
    it('inserts the default occasion for the trip', async () => {
      mockConnExecute.mockResolvedValue([{ insertId: 900 }]);

      await insertDefaultOccasion(db.conn as never, tripId);

      expect(mockConnExecute).toHaveBeenCalledWith(INSERT_OCCASION_SQL, [
        tripId,
      ]);
    });
  });

  describe('seedTripChecklist', () => {
    it.each([
      {
        label: 'the template has categories',
        template: [{ id: 1, name: '衣物' }],
        expectCopy: true,
        expectedCount: 1,
      },
      {
        label: 'the template is empty',
        template: [],
        expectCopy: false,
        expectedCount: 0,
      },
    ])(
      'copies the template and always adds the default occasion when $label',
      async ({ template, expectCopy, expectedCount }) => {
        mockTemplate(template);

        const count = await seedTripChecklist(db.conn as never, tripId);

        const executedSql = mockConnExecute.mock.calls.map(([sql]) => sql);
        expect(count).toBe(expectedCount);
        expect(executedSql.includes(INSERT_CATEGORY_SQL)).toBe(expectCopy);
        expect(executedSql.at(-1)).toBe(INSERT_OCCASION_SQL);
        if (expectCopy) {
          expect(mockConnExecute).toHaveBeenCalledWith(INSERT_CATEGORY_SQL, [
            tripId,
            '衣物',
            0,
          ]);
          expect(mockConnQuery).toHaveBeenCalledWith(
            'INSERT INTO checklist_trip_item_specs (checklist_trip_item_id, name, storage_location) VALUES ?',
            [[[600, '防水', null]]],
          );
        }
      },
    );

    it('does not add the occasion when copying the template fails', async () => {
      mockConnExecute.mockRejectedValue(new Error('db error'));

      await expect(seedTripChecklist(db.conn as never, tripId)).rejects.toThrow(
        'db error',
      );

      expect(mockConnExecute).not.toHaveBeenCalledWith(
        INSERT_OCCASION_SQL,
        expect.anything(),
      );
    });
  });
});
