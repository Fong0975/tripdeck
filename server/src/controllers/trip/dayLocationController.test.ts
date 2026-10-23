import { describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/trip', () => ({
  addLocation: vi.fn(),
  deleteLocation: vi.fn(),
  findById: vi.fn(),
  findDayByIdAndTripId: vi.fn(),
  updateLocation: vi.fn(),
}));

import * as tripRepo from '../../repositories/trip';
import { makeTrip } from '../../test-utils/fixtures';
import {
  createMockReqRes,
  expectJsonStatus,
  itReturns500,
  type Returns500Case,
} from '../../test-utils/httpMocks';
import type { DayLocation } from '../../types/trip';

import {
  addDayLocation,
  deleteDayLocation,
  updateDayLocation,
} from './dayLocationController';

const sampleTrip = makeTrip();

const sampleDay = { id: 10, day: 1, date: '2024-05-10' };

const sampleLocation: DayLocation = {
  id: 300,
  name: 'Kyoto Station',
};

function expectNoContent(
  res: ReturnType<typeof createMockReqRes>['res'],
): void {
  expect(res.status).toHaveBeenCalledWith(204);
  expect(res.send).toHaveBeenCalled();
}

describe('Day locations', () => {
  describe('addDayLocation', () => {
    it.each([
      { name: 'name is missing', body: {} },
      { name: 'name is blank', body: { name: '   ' } },
    ])('returns 400 when $name', async ({ body }) => {
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body,
      });

      await addDayLocation(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(tripRepo.findDayByIdAndTripId).not.toHaveBeenCalled();
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
    it.each([
      { name: 'name is missing', body: {} },
      { name: 'name is blank', body: { name: '   ' } },
    ])('returns 400 when $name', async ({ body }) => {
      const { req, res } = createMockReqRes({
        params: { tripId: '1', locationId: '300' },
        body,
      });

      await updateDayLocation(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(tripRepo.findById).not.toHaveBeenCalled();
    });

    it('returns 404 when the trip is not found', async () => {
      vi.mocked(tripRepo.findById).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', locationId: '300' },
        body: { name: 'Updated Location' },
      });

      await updateDayLocation(req, res);

      expectJsonStatus(res, 404, { error: 'Trip not found' });
      expect(tripRepo.updateLocation).not.toHaveBeenCalled();
    });

    it('returns 404 when the location is not found', async () => {
      vi.mocked(tripRepo.findById).mockResolvedValue(sampleTrip);
      vi.mocked(tripRepo.updateLocation).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', locationId: '300' },
        body: { name: 'Updated Location' },
      });

      await updateDayLocation(req, res);

      expectJsonStatus(res, 404, { error: 'Location not found' });
    });

    it('updates the location and responds with the trimmed name', async () => {
      vi.mocked(tripRepo.findById).mockResolvedValue(sampleTrip);
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
    it('returns 404 when the trip is not found', async () => {
      vi.mocked(tripRepo.findById).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', locationId: '300' },
      });

      await deleteDayLocation(req, res);

      expectJsonStatus(res, 404, { error: 'Trip not found' });
      expect(tripRepo.deleteLocation).not.toHaveBeenCalled();
    });

    it('returns 404 when the location is not found', async () => {
      vi.mocked(tripRepo.findById).mockResolvedValue(sampleTrip);
      vi.mocked(tripRepo.deleteLocation).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', locationId: '300' },
      });

      await deleteDayLocation(req, res);

      expectJsonStatus(res, 404, { error: 'Location not found' });
    });

    it('deletes the location and responds with 204', async () => {
      vi.mocked(tripRepo.findById).mockResolvedValue(sampleTrip);
      vi.mocked(tripRepo.deleteLocation).mockResolvedValue(true);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', locationId: '300' },
      });

      await deleteDayLocation(req, res);

      expectNoContent(res);
    });
  });
});

describe('500 error handling', () => {
  const cases: Returns500Case[] = [
    {
      name: 'addDayLocation',
      handler: addDayLocation,
      req: {
        params: { tripId: '1', dayId: '10' },
        body: { name: 'Kyoto Station' },
      },
      arrange: error =>
        vi.mocked(tripRepo.findDayByIdAndTripId).mockRejectedValue(error),
      expectedError: 'Failed to add location',
    },
    {
      name: 'updateDayLocation',
      handler: updateDayLocation,
      req: {
        params: { tripId: '1', locationId: '300' },
        body: { name: 'Updated Location' },
      },
      arrange: error => vi.mocked(tripRepo.findById).mockRejectedValue(error),
      expectedError: 'Failed to update location',
    },
    {
      name: 'deleteDayLocation',
      handler: deleteDayLocation,
      req: { params: { tripId: '1', locationId: '300' } },
      arrange: error => vi.mocked(tripRepo.findById).mockRejectedValue(error),
      expectedError: 'Failed to delete location',
    },
  ];

  itReturns500(cases);
});
