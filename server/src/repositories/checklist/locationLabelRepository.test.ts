import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db, routeSql } from '../../test-utils/dbMocks';

import {
  createLocationLabel,
  deleteLocationLabel,
  findDisallowedLocation,
  getLocationLabel,
  listLocationLabels,
  listOrphanLocations,
  setLocationLabelShowAsGroup,
} from './locationLabelRepository';

vi.mock('../../config/database', async () => {
  const { db } = await import('../../test-utils/dbMocks');
  return db.module;
});

const mockPoolExecute = db.pool.execute;
const mockConnExecute = db.conn.execute;

const labelRows = [
  { id: 1, name: '託運', show_as_group: 1, sort_order: 0 },
  { id: 2, name: '隨身', show_as_group: 0, sort_order: 1 },
];

function normalised(mock: typeof mockConnExecute): Array<[string, unknown[]]> {
  return mock.mock.calls.map(([sql, params]) => [
    (sql as string).replace(/\s+/g, ' ').trim(),
    params,
  ]);
}

describe('locationLabelRepository', () => {
  beforeEach(() => {
    mockPoolExecute.mockReset();
    mockConnExecute.mockReset();
    db.conn.commit.mockReset();
    db.conn.rollback.mockReset();
  });

  describe('listLocationLabels', () => {
    it('maps show_as_group to a boolean and keeps the stored order', async () => {
      mockPoolExecute.mockResolvedValue([labelRows]);

      expect(await listLocationLabels()).toEqual([
        { id: 1, name: '託運', show_as_group: true, sort_order: 0 },
        { id: 2, name: '隨身', show_as_group: false, sort_order: 1 },
      ]);
    });
  });

  describe('getLocationLabel', () => {
    it.each([
      {
        name: 'returns the label',
        rows: [labelRows[1]],
        expected: { id: 2, name: '隨身', show_as_group: false, sort_order: 1 },
      },
      { name: 'returns null when it does not exist', rows: [], expected: null },
    ])('$name', async ({ rows, expected }) => {
      mockPoolExecute.mockResolvedValue([rows]);

      expect(await getLocationLabel(2)).toEqual(expected);
    });
  });

  describe('createLocationLabel', () => {
    it('appends the label after the highest sort_order', async () => {
      routeSql(mockConnExecute, [
        ['MAX(sort_order)', [[{ next_order: 2 }]]],
        ['INSERT INTO', [{ insertId: 7 }]],
      ]);

      const result = await createLocationLabel('手提', false);

      expect(result).toEqual({
        status: 'created',
        label: { id: 7, name: '手提', show_as_group: false, sort_order: 2 },
      });
      expect(normalised(mockConnExecute)[1]).toEqual([
        'INSERT INTO checklist_location_labels (name, show_as_group, sort_order) VALUES (?, ?, ?)',
        ['手提', 0, 2],
      ]);
      expect(db.conn.commit).toHaveBeenCalled();
    });

    it.each([
      {
        name: 'reports a duplicate name',
        error: Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }),
        expected: { status: 'duplicate' },
      },
    ])('$name', async ({ error, expected }) => {
      mockConnExecute
        .mockResolvedValueOnce([[{ next_order: 0 }]])
        .mockRejectedValueOnce(error);

      expect(await createLocationLabel('託運', true)).toEqual(expected);
      expect(db.conn.rollback).toHaveBeenCalled();
    });

    it('rethrows other database errors', async () => {
      const failure = new Error('connection lost');
      mockConnExecute
        .mockResolvedValueOnce([[{ next_order: 0 }]])
        .mockRejectedValueOnce(failure);

      await expect(createLocationLabel('託運', true)).rejects.toBe(failure);
    });
  });

  describe('setLocationLabelShowAsGroup', () => {
    it('updates the flag and returns the stored label', async () => {
      mockPoolExecute
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[{ ...labelRows[0], show_as_group: 0 }]]);

      const label = await setLocationLabelShowAsGroup(1, false);

      expect(mockPoolExecute.mock.calls[0]).toEqual([
        'UPDATE checklist_location_labels SET show_as_group = ? WHERE id = ?',
        [0, 1],
      ]);
      expect(label).toEqual({
        id: 1,
        name: '託運',
        show_as_group: false,
        sort_order: 0,
      });
    });

    it('returns null for a missing label', async () => {
      mockPoolExecute
        .mockResolvedValueOnce([{ affectedRows: 0 }])
        .mockResolvedValueOnce([[]]);

      expect(await setLocationLabelShowAsGroup(9, true)).toBeNull();
    });
  });

  describe('deleteLocationLabel', () => {
    it('returns false without touching the template when the label is missing', async () => {
      routeSql(mockConnExecute, [['FROM checklist_location_labels', [[]]]]);

      expect(await deleteLocationLabel(9)).toBe(false);
      expect(
        normalised(mockConnExecute).filter(([sql]) => sql.startsWith('DELETE')),
      ).toEqual([]);
    });

    it('deletes the label and strips exactly its name from the template', async () => {
      routeSql(
        mockConnExecute,
        [
          ['FROM checklist_location_labels', [[labelRows[0]]]],
          [
            'FROM checklist_template_items',
            [
              [
                { id: 10, storage_location: '託運,隨身' },
                { id: 11, storage_location: '託運' },
                { id: 12, storage_location: '託運行李,隨身' },
              ],
            ],
          ],
          ['FROM checklist_template_item_specs', [[]]],
        ],
        [{ affectedRows: 1 }],
      );

      expect(await deleteLocationLabel(1)).toBe(true);

      const writes = normalised(mockConnExecute).filter(
        ([sql]) => sql.startsWith('DELETE') || sql.startsWith('UPDATE'),
      );
      expect(writes).toEqual([
        ['DELETE FROM checklist_location_labels WHERE id = ?', [1]],
        [
          'UPDATE checklist_template_items SET storage_location = ? WHERE id = ?',
          ['隨身', 10],
        ],
        [
          'UPDATE checklist_template_items SET storage_location = ? WHERE id = ?',
          [null, 11],
        ],
      ]);
      expect(db.conn.commit).toHaveBeenCalled();
    });
  });

  describe('listOrphanLocations', () => {
    it.each([
      {
        name: 'counts the distinct trips per undefined name, ignoring defined ones',
        rows: [
          { trip_id: 1, storage_location: '託運,手提' },
          { trip_id: 1, storage_location: '手提' },
          { trip_id: 2, storage_location: '手提,後背包' },
        ],
        defined: ['託運', '隨身'],
        expected: [
          { name: '手提', trip_count: 2 },
          { name: '後背包', trip_count: 1 },
        ],
      },
      {
        name: 'returns nothing when every name is defined',
        rows: [{ trip_id: 1, storage_location: '託運,隨身' }],
        defined: ['託運', '隨身'],
        expected: [],
      },
    ])('$name', async ({ rows, defined, expected }) => {
      mockPoolExecute.mockResolvedValue([rows]);

      const orphans = await listOrphanLocations(defined);

      expect([...orphans].sort((a, b) => a.name.localeCompare(b.name))).toEqual(
        [...expected].sort((a, b) => a.name.localeCompare(b.name)),
      );
    });
  });

  describe('findDisallowedLocation', () => {
    it.each([
      {
        name: 'allows defined labels',
        requested: '託運,隨身',
        held: [] as string[],
        expected: null,
      },
      {
        name: 'rejects a name that is not defined',
        requested: '託運,手提',
        held: [],
        expected: '手提',
      },
      {
        name: 'allows an undefined name the unit already carries',
        requested: '託運,手提',
        held: ['手提'],
        expected: null,
      },
      {
        name: 'allows clearing the location',
        requested: null,
        held: ['手提'],
        expected: null,
      },
    ])('$name', async ({ requested, held, expected }) => {
      mockPoolExecute.mockResolvedValue([labelRows]);

      expect(await findDisallowedLocation(requested, held)).toBe(expected);
    });

    it('does not query the labels when nothing is requested', async () => {
      await findDisallowedLocation('');

      expect(mockPoolExecute).not.toHaveBeenCalled();
    });
  });
});
