import { describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/trip', () => ({
  addLocation: vi.fn(),
  deleteLocation: vi.fn(),
  findDayByIdAndTripId: vi.fn(),
  updateLocation: vi.fn(),
  verifyLocationBelongsToTrip: vi.fn(),
}));

import * as tripRepo from '../../repositories/trip';
import {
  createMockReqRes,
  expectJsonStatus,
  type Returns500Case,
} from '../../test-utils/httpMocks';
import type { DayLocation } from '../../types/trip';

import {
  addDayLocation,
  deleteDayLocation,
  updateDayLocation,
} from './dayLocationController';

type RejectCase = Omit<Returns500Case, 'expectedError'>;

const sampleDay = { id: 10, day: 1, date: '2024-05-10' };

const sampleLocation: DayLocation = {
  id: 300,
  name: 'Kyoto Station',
};

/** Bodies rejected by both add and update before touching the repository. */
const invalidNameCases: {
  name: string;
  body: Record<string, unknown>;
  error: string;
}[] = [
  { name: 'name is missing', body: {}, error: 'name is required' },
  { name: 'name is blank', body: { name: '   ' }, error: 'name is required' },
  {
    name: 'name is not a string',
    body: { name: 42 },
    error: 'name is required',
  },
  {
    name: 'name exceeds 255 characters',
    body: { name: 'n'.repeat(256) },
    error: 'name must be at most 255 characters',
  },
];

function expectNoContent(
  res: ReturnType<typeof createMockReqRes>['res'],
): void {
  expect(res.status).toHaveBeenCalledWith(204);
  expect(res.send).toHaveBeenCalled();
}

describe('Day locations', () => {
  describe('addDayLocation', () => {
    it.each(invalidNameCases)(
      'returns 400 when $name',
      async ({ body, error }) => {
        const { req, res } = createMockReqRes({
          params: { tripId: '1', dayId: '10' },
          body,
        });

        await addDayLocation(req, res);

        expectJsonStatus(res, 400, { error });
        expect(tripRepo.findDayByIdAndTripId).not.toHaveBeenCalled();
      },
    );

    it('accepts a name at the maximum length once trimmed', async () => {
      vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(sampleDay);
      vi.mocked(tripRepo.addLocation).mockResolvedValue(sampleLocation);
      const name = `  ${'n'.repeat(255)}  `;
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body: { name },
      });

      await addDayLocation(req, res);

      expect(tripRepo.addLocation).toHaveBeenCalledWith(10, { name });
      expectJsonStatus(res, 201, sampleLocation);
    });

    it('returns 404 when the day is not found', async () => {
      vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body: { name: 'Kyoto Station' },
      });

      await addDayLocation(req, res);

      expectJsonStatus(res, 404, { error: 'Day not found' });
    });

    it('creates the location and responds with 201', async () => {
      vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(sampleDay);
      vi.mocked(tripRepo.addLocation).mockResolvedValue(sampleLocation);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body: { name: 'Kyoto Station' },
      });

      await addDayLocation(req, res);

      expect(tripRepo.addLocation).toHaveBeenCalledWith(10, {
        name: 'Kyoto Station',
      });
      expectJsonStatus(res, 201, sampleLocation);
    });
  });

  describe('updateDayLocation', () => {
    it.each(invalidNameCases)(
      'returns 400 when $name',
      async ({ body, error }) => {
        const { req, res } = createMockReqRes({
          params: { tripId: '1', locationId: '300' },
          body,
        });

        await updateDayLocation(req, res);

        expectJsonStatus(res, 400, { error });
        expect(tripRepo.verifyLocationBelongsToTrip).not.toHaveBeenCalled();
      },
    );

    it('returns 404 when the location does not belong to the trip', async () => {
      vi.mocked(tripRepo.verifyLocationBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', locationId: '300' },
        body: { name: 'Updated Location' },
      });

      await updateDayLocation(req, res);

      expect(tripRepo.verifyLocationBelongsToTrip).toHaveBeenCalledWith(300, 1);
      expectJsonStatus(res, 404, { error: 'Location not found' });
      expect(tripRepo.updateLocation).not.toHaveBeenCalled();
    });

    it('returns 404 when the location is not found', async () => {
      vi.mocked(tripRepo.verifyLocationBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.updateLocation).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', locationId: '300' },
        body: { name: 'Updated Location' },
      });

      await updateDayLocation(req, res);

      expectJsonStatus(res, 404, { error: 'Location not found' });
    });

    it('updates the location and responds with the trimmed name', async () => {
      vi.mocked(tripRepo.verifyLocationBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.updateLocation).mockResolvedValue(true);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', locationId: '300' },
        body: { name: '  Updated Location  ' },
      });

      await updateDayLocation(req, res);

      expect(res.json).toHaveBeenCalledWith({
        id: 300,
        name: 'Updated Location',
      });
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('deleteDayLocation', () => {
    it('returns 404 when the location does not belong to the trip', async () => {
      vi.mocked(tripRepo.verifyLocationBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', locationId: '300' },
      });

      await deleteDayLocation(req, res);

      expect(tripRepo.verifyLocationBelongsToTrip).toHaveBeenCalledWith(300, 1);
      expectJsonStatus(res, 404, { error: 'Location not found' });
      expect(tripRepo.deleteLocation).not.toHaveBeenCalled();
    });

    it('returns 404 when the location is not found', async () => {
      vi.mocked(tripRepo.verifyLocationBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.deleteLocation).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', locationId: '300' },
      });

      await deleteDayLocation(req, res);

      expectJsonStatus(res, 404, { error: 'Location not found' });
    });

    it('deletes the location and responds with 204', async () => {
      vi.mocked(tripRepo.verifyLocationBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.deleteLocation).mockResolvedValue(true);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', locationId: '300' },
      });

      await deleteDayLocation(req, res);

      expectNoContent(res);
    });
  });
});

describe('unexpected errors', () => {
  const cases: RejectCase[] = [
    {
      name: 'addDayLocation',
      handler: addDayLocation,
      req: {
        params: { tripId: '1', dayId: '10' },
        body: { name: 'Kyoto Station' },
      },
      arrange: error =>
        vi.mocked(tripRepo.findDayByIdAndTripId).mockRejectedValue(error),
    },
    {
      name: 'updateDayLocation',
      handler: updateDayLocation,
      req: {
        params: { tripId: '1', locationId: '300' },
        body: { name: 'Updated Location' },
      },
      arrange: error =>
        vi
          .mocked(tripRepo.verifyLocationBelongsToTrip)
          .mockRejectedValue(error),
    },
    {
      name: 'deleteDayLocation',
      handler: deleteDayLocation,
      req: { params: { tripId: '1', locationId: '300' } },
      arrange: error =>
        vi
          .mocked(tripRepo.verifyLocationBelongsToTrip)
          .mockRejectedValue(error),
    },
  ];

  it.each(cases)(
    '$name rejects with the underlying error for the error handler',
    async ({ handler, req, arrange }) => {
      const error = new Error('unexpected failure');
      arrange(error);
      const { req: mockReq, res } = createMockReqRes(req);

      await expect(handler(mockReq, res)).rejects.toBe(error);
      expect(res.status).not.toHaveBeenCalled();
    },
  );
});
