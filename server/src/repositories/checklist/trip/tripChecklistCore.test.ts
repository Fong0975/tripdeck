import { describe, expect, it, vi } from 'vitest';

import { db } from '../../../test-utils/dbMocks';

import { findChecklist } from './tripChecklistCore';

vi.mock('../../../config/database', async () => {
  const { db } = await import('../../../test-utils/dbMocks');
  return db.module;
});

const mockPoolExecute = db.pool.execute;

describe('tripChecklistCore', () => {
  describe('findChecklist', () => {
    it('returns null and issues no further queries when there are no occasions', async () => {
      mockPoolExecute.mockResolvedValueOnce([[]]);

      const result = await findChecklist(1);

      expect(result).toBeNull();
      expect(mockPoolExecute).toHaveBeenCalledTimes(1);
    });

    it('aggregates categories with items and specs, and builds a sparse checks map containing only checked=1 entries', async () => {
      mockPoolExecute.mockImplementation((sql: string) => {
        if (sql.includes('checklist_occasions')) {
          return Promise.resolve([
            [
              { id: 1, trip_id: 5, name: '收拾' },
              { id: 2, trip_id: 5, name: '出發前' },
            ],
          ]);
        }
        if (sql.includes('checklist_trip_categories')) {
          return Promise.resolve([[{ id: 10, trip_id: 5, name: '衣物' }]]);
        }
        if (sql.includes('checklist_trip_item_specs')) {
          return Promise.resolve([
            [
              {
                id: 1000,
                checklist_trip_item_id: 100,
                name: '防水',
                storage_location: '登山包',
              },
            ],
          ]);
        }
        if (sql.includes('checklist_trip_items')) {
          return Promise.resolve([
            [
              {
                id: 100,
                checklist_trip_category_id: 10,
                name: '外套',
                quantity: 1,
                notes: null,
                storage_location: null,
              },
              {
                id: 101,
                checklist_trip_category_id: 10,
                name: '襪子',
                quantity: 3,
                notes: null,
                storage_location: null,
              },
            ],
          ]);
        }
        if (sql.includes('checklist_spec_checks')) {
          return Promise.resolve([
            [
              {
                checklist_occasion_id: 2,
                checklist_trip_item_spec_id: 1000,
                location: '託運',
              },
              {
                checklist_occasion_id: 2,
                checklist_trip_item_spec_id: 1000,
                location: '隨身',
              },
            ],
          ]);
        }
        if (sql.includes('checklist_checks')) {
          return Promise.resolve([
            [
              {
                checklist_occasion_id: 1,
                checklist_trip_item_id: 100,
                location: '',
              },
              {
                checklist_occasion_id: 1,
                checklist_trip_item_id: 101,
                location: '隨身',
              },
            ],
          ]);
        }
        return Promise.resolve([[]]);
      });

      const result = await findChecklist(5);

      expect(result).toEqual({
        tripId: 5,
        categories: [
          {
            id: 10,
            name: '衣物',
            items: [
              {
                id: 100,
                name: '外套',
                quantity: 1,
                notes: null,
                storage_location: null,
                specs: [{ id: 1000, name: '防水', storage_location: '登山包' }],
              },
              {
                id: 101,
                name: '襪子',
                quantity: 3,
                notes: null,
                storage_location: null,
                specs: [],
              },
            ],
          },
        ],
        occasions: [
          {
            id: 1,
            name: '收拾',
            checks: { '100|': true, '101|隨身': true },
            specChecks: {},
          },
          {
            id: 2,
            name: '出發前',
            checks: {},
            specChecks: { '1000|託運': true, '1000|隨身': true },
          },
        ],
      });
      expect(result?.occasions[0].checks).not.toHaveProperty('101|託運');
    });
  });
});
