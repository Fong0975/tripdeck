import { describe, expect, it, vi } from 'vitest';

import { db, isSelectFrom, routeSql } from '../../../test-utils/dbMocks';

import {
  createTripItem,
  deleteTripItem,
  setCheck,
  updateTripItem,
  verifyItemBelongsToTrip,
} from './tripItemRepository';

vi.mock('../../../config/database', async () => {
  const { db } = await import('../../../test-utils/dbMocks');
  return db.module;
});

const mockPoolExecute = db.pool.execute;

describe('tripItemRepository', () => {
  describe('verifyItemBelongsToTrip', () => {
    it.each([
      { rows: [{ id: 1 }], expected: true },
      { rows: [], expected: false },
    ])(
      'returns $expected when rows.length is $rows.length',
      async ({ rows, expected }) => {
        mockPoolExecute.mockResolvedValue([rows]);

        const result = await verifyItemBelongsToTrip(1, 2);

        expect(result).toBe(expected);
      },
    );
  });

  describe('createTripItem', () => {
    it('defaults quantity/notes/storage_location to null when omitted from input', async () => {
      mockPoolExecute.mockResolvedValue([{ insertId: 100 }]);

      const result = await createTripItem(10, { name: '外套' });

      expect(result).toEqual({
        id: 100,
        name: '外套',
        quantity: null,
        notes: null,
        storage_location: null,
        specs: [],
      });
    });

    it('carries through quantity/notes/storage_location when provided', async () => {
      mockPoolExecute.mockResolvedValue([{ insertId: 101 }]);

      const result = await createTripItem(10, {
        name: '雨傘',
        quantity: 2,
        notes: '記得帶',
        storage_location: '背包',
      });

      expect(result).toEqual({
        id: 101,
        name: '雨傘',
        quantity: 2,
        notes: '記得帶',
        storage_location: '背包',
        specs: [],
      });
    });
  });

  describe('deleteTripItem', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        const result = await deleteTripItem(1);

        expect(result).toBe(expected);
      },
    );
  });

  describe('updateTripItem', () => {
    const CURRENT_ITEM = {
      id: 1,
      checklist_trip_category_id: 10,
      name: '舊名稱',
      quantity: 1,
      notes: '舊備註',
      storage_location: '舊位置',
    };

    const SPEC_ROW = {
      id: 700,
      checklist_trip_item_id: 1,
      name: '防水',
      storage_location: '託運',
    };

    /** Routes the item SELECT, the specs SELECT (`specRows`) and every write. */
    function mockSelectThenUpdate(
      row = CURRENT_ITEM,
      specRows: Array<typeof SPEC_ROW> = [],
    ) {
      routeSql(
        mockPoolExecute,
        [
          [sql => isSelectFrom(sql, 'checklist_trip_item_specs'), [specRows]],
          [sql => sql.trim().startsWith('SELECT'), [[row]]],
        ],
        [{ affectedRows: 1 }],
      );
    }

    function updateParams(): unknown[] | undefined {
      return mockPoolExecute.mock.calls.find(([sql]) =>
        (sql as string).trim().startsWith('UPDATE'),
      )?.[1];
    }

    it('returns null when the item does not exist', async () => {
      mockPoolExecute.mockResolvedValueOnce([[]]);

      const result = await updateTripItem(999, {});

      expect(result).toBeNull();
    });

    it.each([
      {
        name: 'name provided as a non-empty string overrides the current value',
        data: { name: '新名稱' },
        expected: '新名稱',
      },
      {
        name: 'name provided as an empty string falls back to the current value',
        data: { name: '' },
        expected: CURRENT_ITEM.name,
      },
    ])('$name', async ({ data, expected }) => {
      mockSelectThenUpdate();

      const result = await updateTripItem(1, data);

      expect(result?.name).toBe(expected);
    });

    it('keeps the current name and quantity when data is empty', async () => {
      mockSelectThenUpdate();

      const result = await updateTripItem(1, {});

      expect(result?.name).toBe(CURRENT_ITEM.name);
      expect(result?.quantity).toBe(CURRENT_ITEM.quantity);
    });

    it('overrides notes when notes is provided in data', async () => {
      mockSelectThenUpdate();

      const result = await updateTripItem(1, { notes: '新備註' });

      expect(result?.notes).toBe('新備註');
    });

    it.each([
      {
        name: 'prunes the checks outside the new locations when the location changed',
        data: { storage_location: '託運,隨身' },
        pruned: true,
      },
      {
        name: 'does not touch the checks when the location is unchanged',
        data: {
          name: '新名稱',
          storage_location: CURRENT_ITEM.storage_location,
        },
        pruned: false,
      },
      {
        name: 'does not touch the checks when the location is omitted',
        data: { name: '新名稱' },
        pruned: false,
      },
    ])('$name', async ({ data, pruned }) => {
      mockSelectThenUpdate();

      await updateTripItem(1, data);

      const deletes = mockPoolExecute.mock.calls.filter(([sql]) =>
        (sql as string).includes('DELETE FROM checklist_checks'),
      );
      expect(deletes.length > 0).toBe(pruned);
    });

    it('prunes the item checks down to the new locations', async () => {
      mockSelectThenUpdate();

      await updateTripItem(1, { storage_location: '託運,隨身' });

      expect(mockPoolExecute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM checklist_checks'),
        [1, '託運', '隨身'],
      );
    });

    describe('an item that has specs', () => {
      it.each([
        {
          name: 'ignores a requested storage_location and stores null',
          data: { name: '新名稱', storage_location: '託運,隨身' },
        },
        {
          name: 'clears the stored legacy storage_location when it is omitted',
          data: { name: '新名稱' },
        },
      ])('$name', async ({ data }) => {
        mockSelectThenUpdate(CURRENT_ITEM, [SPEC_ROW]);

        const result = await updateTripItem(1, data);

        expect(result?.storage_location).toBeNull();
        expect(updateParams()).toEqual([
          '新名稱',
          CURRENT_ITEM.quantity,
          CURRENT_ITEM.notes,
          null,
          1,
        ]);
        expect(result?.specs).toEqual([
          { id: 700, name: '防水', storage_location: '託運' },
        ]);
      });

      it('prunes the item checks to the empty location once, since its location was cleared', async () => {
        mockSelectThenUpdate(CURRENT_ITEM, [SPEC_ROW]);

        await updateTripItem(1, { storage_location: '託運' });

        const deletes = mockPoolExecute.mock.calls.filter(([sql]) =>
          (sql as string).includes('DELETE FROM'),
        );
        expect(deletes).toHaveLength(1);
        expect(deletes[0][1]).toEqual([1, '']);
      });

      it('does not prune when the item already holds no location', async () => {
        mockSelectThenUpdate({ ...CURRENT_ITEM, storage_location: null }, [
          SPEC_ROW,
        ]);

        await updateTripItem(1, { storage_location: '託運' });

        expect(mockPoolExecute).not.toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM'),
          expect.anything(),
        );
      });
    });

    it('reads the specs before writing the item', async () => {
      mockSelectThenUpdate();

      await updateTripItem(1, { name: '新名稱' });

      const sqls = mockPoolExecute.mock.calls.map(([sql]) => sql as string);
      const specsIndex = sqls.findIndex(sql =>
        sql.includes('checklist_trip_item_specs'),
      );
      const updateIndex = sqls.findIndex(sql =>
        sql.trim().startsWith('UPDATE'),
      );
      expect(specsIndex).toBeGreaterThan(-1);
      expect(specsIndex).toBeLessThan(updateIndex);
    });
  });

  describe('setCheck', () => {
    it.each([{ location: '託運' }, { location: '' }])(
      'issues an INSERT ... ON DUPLICATE KEY UPDATE for location "$location" when checked is true',
      async ({ location }) => {
        mockPoolExecute.mockResolvedValue([{}]);

        await setCheck(1, 100, location, true);

        expect(mockPoolExecute).toHaveBeenCalledWith(
          expect.stringContaining('ON DUPLICATE KEY UPDATE checked = 1'),
          [1, 100, location],
        );
      },
    );

    it.each([{ location: '隨身' }, { location: '' }])(
      'deletes only the row of location "$location" when checked is false',
      async ({ location }) => {
        mockPoolExecute.mockResolvedValue([{}]);

        await setCheck(1, 100, location, false);

        expect(mockPoolExecute).toHaveBeenCalledWith(
          'DELETE FROM checklist_checks WHERE checklist_occasion_id = ? AND checklist_trip_item_id = ? AND location = ?',
          [1, 100, location],
        );
      },
    );
  });
});
