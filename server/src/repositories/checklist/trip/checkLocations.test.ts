import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../../../test-utils/dbMocks';

import { getItemCheckLocations, getSpecCheckLocations } from './checkLocations';

vi.mock('../../../config/database', async () => {
  const { db } = await import('../../../test-utils/dbMocks');
  return db.module;
});

const mockPoolExecute = db.pool.execute;

const CASES = [
  {
    name: 'lists every storage option in canonical order',
    rows: [{ storage_location: '隨身,託運' }],
    expected: ['託運', '隨身'],
  },
  {
    name: 'lists a single storage option',
    rows: [{ storage_location: '隨身' }],
    expected: ['隨身'],
  },
  {
    name: 'falls back to the empty location without a storage location',
    rows: [{ storage_location: null }],
    expected: [''],
  },
  {
    name: 'ignores unknown storage values',
    rows: [{ storage_location: '後背包' }],
    expected: [''],
  },
  {
    name: 'falls back to the empty location when the row is missing',
    rows: [],
    expected: [''],
  },
];

describe('checkLocations', () => {
  beforeEach(() => {
    mockPoolExecute.mockReset();
  });

  it.each(CASES)('getItemCheckLocations $name', async ({ rows, expected }) => {
    mockPoolExecute.mockResolvedValue([rows]);

    expect(await getItemCheckLocations(3)).toEqual(expected);
    expect(mockPoolExecute).toHaveBeenCalledWith(
      expect.stringContaining('FROM checklist_trip_items'),
      [3],
    );
  });

  it.each(CASES)('getSpecCheckLocations $name', async ({ rows, expected }) => {
    mockPoolExecute.mockResolvedValue([rows]);

    expect(await getSpecCheckLocations(4)).toEqual(expected);
    expect(mockPoolExecute).toHaveBeenCalledWith(
      'SELECT storage_location FROM checklist_trip_item_specs WHERE id = ?',
      [4],
    );
    expect(mockPoolExecute).toHaveBeenCalledTimes(1);
  });
});
