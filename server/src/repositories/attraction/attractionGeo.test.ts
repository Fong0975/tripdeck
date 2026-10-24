import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/database', async () => {
  const { db } = await import('../../test-utils/dbMocks');
  return db.module;
});

import { db } from '../../test-utils/dbMocks';

import { findGeoRowsForTrip, saveGeo } from './attractionGeo';

const mockExecute = db.pool.execute;

describe('attractionGeo', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  describe('findGeoRowsForTrip', () => {
    it("returns the trip's attractions ordered by day and position", async () => {
      const rows = [{ id: 1 }, { id: 2 }];
      mockExecute.mockResolvedValue([rows]);

      await expect(findGeoRowsForTrip(7)).resolves.toBe(rows);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringMatching(
          /JOIN trip_days[\s\S]*ORDER BY td\.day, ta\.sort_order/,
        ),
        [7],
      );
    });
  });

  describe('saveGeo', () => {
    const row = { id: 5, name: 'Museum', google_map_url: 'https://maps' };
    const geo = {
      latitude: 25,
      longitude: 121,
      geoSource: 'geocode' as const,
      geoKey: 'k'.repeat(64),
    };

    it.each([
      { description: 'a row was updated', affectedRows: 1, expected: true },
      {
        description: 'no row matched the name and link',
        affectedRows: 0,
        expected: false,
      },
    ])(
      'returns $expected when $description',
      async ({ affectedRows, expected }) => {
        mockExecute.mockResolvedValue([{ affectedRows }]);

        await expect(saveGeo(row, geo)).resolves.toBe(expected);
      },
    );

    it('only writes while the name and link still match, comparing a null link null-safely', async () => {
      mockExecute.mockResolvedValue([{ affectedRows: 1 }]);

      await saveGeo({ ...row, google_map_url: null }, geo);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('google_map_url <=> ?'),
        [25, 121, 'geocode', 'k'.repeat(64), 5, 'Museum', null],
      );
    });
  });
});
