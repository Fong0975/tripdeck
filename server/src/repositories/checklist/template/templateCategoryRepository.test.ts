import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCategory,
  deleteCategory,
  findTemplate,
  updateCategory,
} from './templateCategoryRepository';

const mockPoolExecute = vi.fn();

vi.mock('../../../config/database', () => ({
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

describe('templateCategoryRepository', () => {
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
});
