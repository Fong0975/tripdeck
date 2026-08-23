import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createItemSpec,
  deleteItemSpec,
  updateItemSpec,
  verifySpecBelongsToItem,
} from './templateItemSpecRepository';

const mockPoolExecute = vi.fn();

vi.mock('../../../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
  },
}));

const CURRENT_SPEC_ROW = {
  id: 1,
  checklist_template_item_id: 5,
  name: 'Old Spec',
  storage_location: 'old location',
};

describe('templateItemSpecRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createItemSpec', () => {
    it('returns null and issues no INSERT when the item does not exist', async () => {
      mockPoolExecute.mockResolvedValue([[]]);

      const result = await createItemSpec(999, { name: 'Spec A' });

      expect(result).toBeNull();
      expect(mockPoolExecute).toHaveBeenCalledTimes(1);
    });

    it('inserts a spec and defaults storage_location to null when omitted', async () => {
      mockPoolExecute.mockImplementation((sql: unknown) => {
        if ((sql as string).trim().startsWith('SELECT')) {
          return Promise.resolve([[{ id: 7 }]]);
        }
        return Promise.resolve([{ insertId: 20 }]);
      });

      const result = await createItemSpec(7, { name: 'Spec A' });

      expect(result).toEqual({
        id: 20,
        name: 'Spec A',
        storage_location: null,
      });
    });
  });

  describe('updateItemSpec', () => {
    function mockSpecSelectThenUpdate(curRow = CURRENT_SPEC_ROW) {
      mockPoolExecute.mockImplementation((sql: unknown) => {
        if ((sql as string).trim().startsWith('SELECT')) {
          return Promise.resolve([[curRow]]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });
    }

    it('returns null when the spec does not exist', async () => {
      mockPoolExecute.mockResolvedValue([[]]);

      const result = await updateItemSpec(999, { name: 'New Spec' });

      expect(result).toBeNull();
    });

    it.each([
      {
        name: 'storage_location omitted falls back to the current value',
        data: { name: 'New Spec' },
        expectedParam: CURRENT_SPEC_ROW.storage_location,
      },
      {
        name: 'storage_location provided overrides the current value',
        data: { name: 'New Spec', storage_location: 'new location' },
        expectedParam: 'new location',
      },
    ])('$name', async ({ data, expectedParam }) => {
      mockSpecSelectThenUpdate();

      await updateItemSpec(1, data);

      const updateCall = mockPoolExecute.mock.calls.find(([sql]) =>
        (sql as string).trim().startsWith('UPDATE'),
      );
      expect(updateCall?.[1][1]).toBe(expectedParam);
    });
  });

  describe('deleteItemSpec', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        const result = await deleteItemSpec(1);

        expect(result).toBe(expected);
      },
    );
  });

  describe('verifySpecBelongsToItem', () => {
    it.each([
      { rows: [{ id: 1 }], expected: true },
      { rows: [], expected: false },
    ])(
      'returns $expected when rows.length is $rows.length',
      async ({ rows, expected }) => {
        mockPoolExecute.mockResolvedValue([rows]);

        const result = await verifySpecBelongsToItem(1, 10);

        expect(result).toBe(expected);
      },
    );
  });
});
