import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createTripCategory,
  deleteTripCategory,
  updateTripCategory,
  verifyCategoryBelongsToTrip,
} from './tripCategoryRepository';

const mockPoolExecute = vi.fn();

vi.mock('../../../config/database', () => ({
  default: {
    execute: (...args: unknown[]) => mockPoolExecute(...args),
  },
}));

describe('tripCategoryRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyCategoryBelongsToTrip', () => {
    it.each([
      { rows: [{ id: 1 }], expected: true },
      { rows: [], expected: false },
    ])(
      'returns $expected when rows.length is $rows.length',
      async ({ rows, expected }) => {
        mockPoolExecute.mockResolvedValue([rows]);

        const result = await verifyCategoryBelongsToTrip(1, 2);

        expect(result).toBe(expected);
      },
    );
  });

  describe('createTripCategory', () => {
    it('returns the created category with an empty items array', async () => {
      mockPoolExecute.mockResolvedValue([{ insertId: 42 }]);

      const result = await createTripCategory(5, '衣物');

      expect(result).toEqual({ id: 42, name: '衣物', items: [] });
    });
  });

  describe('updateTripCategory', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        const result = await updateTripCategory(1, '新名稱');

        expect(result).toBe(expected);
      },
    );
  });

  describe('deleteTripCategory', () => {
    it.each([
      { affectedRows: 1, expected: true },
      { affectedRows: 0, expected: false },
    ])(
      'returns $expected when affectedRows is $affectedRows',
      async ({ affectedRows, expected }) => {
        mockPoolExecute.mockResolvedValue([{ affectedRows }]);

        const result = await deleteTripCategory(1);

        expect(result).toBe(expected);
      },
    );
  });
});
