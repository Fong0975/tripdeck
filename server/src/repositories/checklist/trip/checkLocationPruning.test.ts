import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../../../test-utils/dbMocks';

import { pruneItemChecks, pruneSpecChecks } from './checkLocationPruning';

vi.mock('../../../config/database', async () => {
  const { db } = await import('../../../test-utils/dbMocks');
  return db.module;
});

const mockPoolExecute = db.pool.execute;

/** Normalised `[sql, params]` of every statement issued so far. */
function statements(): Array<[string, unknown[]]> {
  return mockPoolExecute.mock.calls.map(([sql, params]) => [
    (sql as string).replace(/\s+/g, ' '),
    params,
  ]);
}

describe('checkLocationPruning', () => {
  beforeEach(() => {
    mockPoolExecute.mockReset();
    mockPoolExecute.mockResolvedValue([{ affectedRows: 0 }]);
  });

  describe('pruneItemChecks', () => {
    it.each([
      {
        name: 'keeps only the locations the item still has',
        itemLocation: '託運,隨身',
        expected: [
          'DELETE FROM checklist_checks WHERE checklist_trip_item_id = ? AND location NOT IN (?, ?)',
          [5, '託運', '隨身'],
        ],
      },
      {
        name: 'keeps a single location',
        itemLocation: '隨身',
        expected: [
          'DELETE FROM checklist_checks WHERE checklist_trip_item_id = ? AND location NOT IN (?)',
          [5, '隨身'],
        ],
      },
      {
        name: 'keeps only the empty location when the item has none',
        itemLocation: null,
        expected: [
          'DELETE FROM checklist_checks WHERE checklist_trip_item_id = ? AND location NOT IN (?)',
          [5, ''],
        ],
      },
      {
        name: 'keeps names that are not defined labels any more',
        itemLocation: '後背包,隨身',
        expected: [
          'DELETE FROM checklist_checks WHERE checklist_trip_item_id = ? AND location NOT IN (?, ?)',
          [5, '後背包', '隨身'],
        ],
      },
    ])('$name', async ({ itemLocation, expected }) => {
      await pruneItemChecks(5, itemLocation);

      expect(statements()).toEqual([expected]);
    });

    it('never touches the spec checks', async () => {
      await pruneItemChecks(5, '託運');

      expect(statements().map(([sql]) => sql)).not.toContainEqual(
        expect.stringContaining('checklist_spec_checks'),
      );
    });
  });

  describe('pruneSpecChecks', () => {
    it.each([
      {
        name: 'keeps only the locations the spec still has',
        specLocation: '託運,隨身',
        expected: [
          'DELETE FROM checklist_spec_checks WHERE checklist_trip_item_spec_id = ? AND location NOT IN (?, ?)',
          [9, '託運', '隨身'],
        ],
      },
      {
        name: 'keeps a single location',
        specLocation: '託運',
        expected: [
          'DELETE FROM checklist_spec_checks WHERE checklist_trip_item_spec_id = ? AND location NOT IN (?)',
          [9, '託運'],
        ],
      },
      {
        name: 'keeps only the empty location when the spec has none',
        specLocation: null,
        expected: [
          'DELETE FROM checklist_spec_checks WHERE checklist_trip_item_spec_id = ? AND location NOT IN (?)',
          [9, ''],
        ],
      },
    ])('$name', async ({ specLocation, expected }) => {
      await pruneSpecChecks(9, specLocation);

      expect(statements()).toEqual([expected]);
    });

    it('does not read the item, so a spec never inherits its location', async () => {
      await pruneSpecChecks(9, null);

      expect(mockPoolExecute).toHaveBeenCalledTimes(1);
      expect(statements().map(([sql]) => sql)).not.toContainEqual(
        expect.stringContaining('SELECT'),
      );
    });
  });
});
