import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCategory,
  createItem,
  createItemSpec,
  deleteCategory,
  deleteItem,
  deleteItemSpec,
  findTemplate,
  updateCategory,
  updateItem,
  updateItemSpec,
  verifyItemBelongsToCategory,
  verifySpecBelongsToItem,
} from './checklistTemplateRepository';

const mockPoolExecute = vi.fn();

vi.mock('../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
  },
}));

function isSelectFrom(sql: unknown, table: string): boolean {
  return (
    (sql as string).trim().startsWith('SELECT') &&
    (sql as string).includes(table)
  );
}

const CURRENT_ITEM_ROW = {
  id: 1,
  checklist_template_category_id: 5,
  name: 'Old Item',
  quantity: 2,
  notes: 'old notes',
  storage_location: 'old location',
};

const CURRENT_SPEC_ROW = {
  id: 1,
  checklist_template_item_id: 5,
  name: 'Old Spec',
  storage_location: 'old location',
};

describe('checklistTemplateRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findTemplate', () => {
    it('returns an empty categories array when there are no categories', async () => {
      mockPoolExecute.mockResolvedValue([[]]);

      const result = await findTemplate();

      expect(result).toEqual({ categories: [] });
      expect(mockPoolExecute).toHaveBeenCalledTimes(1);
    });

    it('nests items and specs under their categories, including an empty category and an item with no specs', async () => {
      const catRows = [
        { id: 1, name: 'Clothing' },
        { id: 2, name: 'Empty Category' },
      ];
      const itemRows = [
        {
          id: 10,
          checklist_template_category_id: 1,
          name: 'Shirt',
          quantity: 3,
          notes: 'note',
          storage_location: 'bag',
        },
        {
          id: 11,
          checklist_template_category_id: 1,
          name: 'Socks',
          quantity: null,
          notes: null,
          storage_location: null,
        },
      ];
      const specRows = [
        {
          id: 100,
          checklist_template_item_id: 10,
          name: 'Color',
          storage_location: 'top drawer',
        },
      ];

      mockPoolExecute.mockImplementation((sql: unknown) => {
        if (isSelectFrom(sql, 'checklist_template_item_specs')) {
          return Promise.resolve([specRows]);
        }
        if (isSelectFrom(sql, 'checklist_template_items')) {
          return Promise.resolve([itemRows]);
        }
        if (isSelectFrom(sql, 'checklist_template_categories')) {
          return Promise.resolve([catRows]);
        }
        return Promise.resolve([[]]);
      });

      const result = await findTemplate();

      expect(result).toEqual({
        categories: [
          {
            id: 1,
            name: 'Clothing',
            items: [
              {
                id: 10,
                name: 'Shirt',
                quantity: 3,
                notes: 'note',
                storage_location: 'bag',
                specs: [
                  { id: 100, name: 'Color', storage_location: 'top drawer' },
                ],
              },
              {
                id: 11,
                name: 'Socks',
                quantity: null,
                notes: null,
                storage_location: null,
                specs: [],
              },
            ],
          },
          {
            id: 2,
            name: 'Empty Category',
            items: [],
          },
        ],
      });
    });
  });

  describe('createCategory', () => {
    it('inserts a category and returns it with an empty items array', async () => {
      mockPoolExecute.mockResolvedValue([{ insertId: 9 }]);

      const result = await createCategory('New Category');

      expect(result).toEqual({ id: 9, name: 'New Category', items: [] });
    });
  });

  describe('updateCategory', () => {
    it('returns null when the category does not exist', async () => {
      mockPoolExecute.mockResolvedValue([[]]);

      const result = await updateCategory(999, 'New Name');

      expect(result).toBeNull();
    });

    it('updates the name and returns the category with its items and specs nested', async () => {
      const catRow = { id: 4, name: 'Old Name' };
      const itemRows = [
        {
          id: 10,
          checklist_template_category_id: 4,
          name: 'Item1',
          quantity: 1,
          notes: null,
          storage_location: null,
        },
      ];
      const specRows = [
        {
          id: 100,
          checklist_template_item_id: 10,
          name: 'Spec1',
          storage_location: 'loc',
        },
      ];

      mockPoolExecute.mockImplementation((sql: unknown) => {
        if (isSelectFrom(sql, 'checklist_template_item_specs')) {
          return Promise.resolve([specRows]);
        }
        if (isSelectFrom(sql, 'checklist_template_items')) {
          return Promise.resolve([itemRows]);
        }
        if (isSelectFrom(sql, 'checklist_template_categories')) {
          return Promise.resolve([[catRow]]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });

      const result = await updateCategory(4, 'New Name');

      expect(result).toEqual({
        id: 4,
        name: 'New Name',
        items: [
          {
            id: 10,
            name: 'Item1',
            quantity: 1,
            notes: null,
            storage_location: null,
            specs: [{ id: 100, name: 'Spec1', storage_location: 'loc' }],
          },
        ],
      });
    });
  });

  describe('deleteCategory', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        const result = await deleteCategory(1);

        expect(result).toBe(expected);
      },
    );
  });

  describe('createItem', () => {
    it('returns null and issues no INSERT when the category does not exist', async () => {
      mockPoolExecute.mockResolvedValue([[]]);

      const result = await createItem(999, { name: 'Item A' });

      expect(result).toBeNull();
      expect(mockPoolExecute).toHaveBeenCalledTimes(1);
    });

    it('inserts an item and defaults quantity/notes/storage_location to null when omitted', async () => {
      mockPoolExecute.mockImplementation((sql: unknown) => {
        if ((sql as string).trim().startsWith('SELECT')) {
          return Promise.resolve([[{ id: 3 }]]);
        }
        return Promise.resolve([{ insertId: 50 }]);
      });

      const result = await createItem(3, { name: 'Item A' });

      expect(result).toEqual({
        id: 50,
        name: 'Item A',
        quantity: null,
        notes: null,
        storage_location: null,
        specs: [],
      });
    });
  });

  describe('updateItem', () => {
    function mockItemSelectThenUpdate(curRow = CURRENT_ITEM_ROW) {
      mockPoolExecute.mockImplementation((sql: unknown) => {
        if (isSelectFrom(sql, 'checklist_template_item_specs')) {
          return Promise.resolve([[]]);
        }
        if ((sql as string).trim().startsWith('SELECT')) {
          return Promise.resolve([[curRow]]);
        }
        return Promise.resolve([{ affectedRows: 1 }]);
      });
    }

    it('returns null when the item does not exist', async () => {
      mockPoolExecute.mockResolvedValue([[]]);

      const result = await updateItem(999, { name: 'New Name' });

      expect(result).toBeNull();
    });

    it.each([
      {
        name: 'quantity omitted falls back to the current value',
        data: { name: 'New Name' },
        paramIndex: 1,
        expectedParam: CURRENT_ITEM_ROW.quantity,
      },
      {
        name: 'quantity provided overrides the current value',
        data: { name: 'New Name', quantity: 9 },
        paramIndex: 1,
        expectedParam: 9,
      },
      {
        name: 'notes omitted falls back to the current value',
        data: { name: 'New Name' },
        paramIndex: 2,
        expectedParam: CURRENT_ITEM_ROW.notes,
      },
      {
        name: 'notes provided overrides the current value',
        data: { name: 'New Name', notes: 'new notes' },
        paramIndex: 2,
        expectedParam: 'new notes',
      },
      {
        name: 'storage_location omitted falls back to the current value',
        data: { name: 'New Name' },
        paramIndex: 3,
        expectedParam: CURRENT_ITEM_ROW.storage_location,
      },
      {
        name: 'storage_location provided overrides the current value',
        data: { name: 'New Name', storage_location: 'new location' },
        paramIndex: 3,
        expectedParam: 'new location',
      },
    ])('$name', async ({ data, paramIndex, expectedParam }) => {
      mockItemSelectThenUpdate();

      await updateItem(1, data);

      const updateCall = mockPoolExecute.mock.calls.find(([sql]) =>
        (sql as string).trim().startsWith('UPDATE'),
      );
      expect(updateCall?.[1][paramIndex]).toBe(expectedParam);
    });
  });

  describe('deleteItem', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        const result = await deleteItem(1);

        expect(result).toBe(expected);
      },
    );
  });

  describe('verifyItemBelongsToCategory', () => {
    it.each([
      { rows: [{ id: 1 }], expected: true },
      { rows: [], expected: false },
    ])(
      'returns $expected when rows.length is $rows.length',
      async ({ rows, expected }) => {
        mockPoolExecute.mockResolvedValue([rows]);

        const result = await verifyItemBelongsToCategory(1, 10);

        expect(result).toBe(expected);
      },
    );
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
