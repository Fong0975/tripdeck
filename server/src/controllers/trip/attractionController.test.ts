import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/attraction');
vi.mock('../../repositories/trip');

import * as attractionRepo from '../../repositories/attraction';
import * as tripRepo from '../../repositories/trip';
import { createMockReqRes, expectJsonStatus } from '../../test-utils/httpMocks';
import type { AttractionResponse } from '../../types/trip';

import {
  addAttraction,
  deleteAttraction,
  duplicateAttraction,
  reorderAttractions,
  updateAttraction,
} from './attractionController';

const sampleDay = { id: 10, day: 1, date: '2024-05-10' };

const sampleAttraction: AttractionResponse = {
  id: 100,
  name: 'Fushimi Inari',
  googleMapUrl: null,
  notes: null,
  nearbyAttractions: null,
  startTime: null,
  endTime: null,
  referenceWebsites: [],
  images: [],
  sortOrder: 0,
};

function expectNoContent(
  res: ReturnType<typeof createMockReqRes>['res'],
): void {
  expect(res.status).toHaveBeenCalledWith(204);
  expect(res.send).toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Attractions', () => {
  describe('addAttraction', () => {
    it('returns 400 when name is missing', async () => {
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body: {},
      });

      await addAttraction(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(tripRepo.findDayByIdAndTripId).not.toHaveBeenCalled();
    });

    it('returns 404 when the day is not found', async () => {
      vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body: { name: 'Fushimi Inari' },
      });

      await addAttraction(req, res);

      expectJsonStatus(res, 404, { error: 'Day not found' });
    });

    it('creates the attraction and responds with 201', async () => {
      vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(sampleDay);
      vi.mocked(attractionRepo.create).mockResolvedValue(sampleAttraction);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body: { name: 'Fushimi Inari' },
      });

      await addAttraction(req, res);

      expect(attractionRepo.create).toHaveBeenCalledWith(10, {
        name: 'Fushimi Inari',
      });
      expectJsonStatus(res, 201, sampleAttraction);
    });
  });

  describe('updateAttraction', () => {
    it('returns 404 when the attraction does not belong to the trip', async () => {
      vi.mocked(attractionRepo.verifyBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', attractionId: '100' },
        body: { name: 'Updated' },
      });

      await updateAttraction(req, res);

      expectJsonStatus(res, 404, { error: 'Attraction not found' });
      expect(attractionRepo.update).not.toHaveBeenCalled();
    });

    it('returns 404 when the update finds nothing to update', async () => {
      vi.mocked(attractionRepo.verifyBelongsToTrip).mockResolvedValue(true);
      vi.mocked(attractionRepo.update).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', attractionId: '100' },
        body: { name: 'Updated' },
      });

      await updateAttraction(req, res);

      expectJsonStatus(res, 404, { error: 'Attraction not found' });
    });

    it('updates the attraction and responds with 200', async () => {
      vi.mocked(attractionRepo.verifyBelongsToTrip).mockResolvedValue(true);
      vi.mocked(attractionRepo.update).mockResolvedValue(sampleAttraction);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', attractionId: '100' },
        body: { name: 'Updated' },
      });

      await updateAttraction(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleAttraction);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('deleteAttraction', () => {
    it('returns 404 when the attraction does not belong to the trip', async () => {
      vi.mocked(attractionRepo.verifyBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', attractionId: '100' },
      });

      await deleteAttraction(req, res);

      expectJsonStatus(res, 404, { error: 'Attraction not found' });
      expect(attractionRepo.deleteById).not.toHaveBeenCalled();
    });

    it('deletes the attraction and responds with 204', async () => {
      vi.mocked(attractionRepo.verifyBelongsToTrip).mockResolvedValue(true);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', attractionId: '100' },
      });

      await deleteAttraction(req, res);

      expectNoContent(res);
    });
  });

  describe('duplicateAttraction', () => {
    it('returns 404 when the attraction does not belong to the trip', async () => {
      vi.mocked(attractionRepo.verifyBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', attractionId: '100' },
      });

      await duplicateAttraction(req, res);

      expectJsonStatus(res, 404, { error: 'Attraction not found' });
      expect(attractionRepo.getDayIdForAttraction).not.toHaveBeenCalled();
    });

    it('duplicates the attraction and responds with 201', async () => {
      vi.mocked(attractionRepo.verifyBelongsToTrip).mockResolvedValue(true);
      vi.mocked(attractionRepo.getDayIdForAttraction).mockResolvedValue(10);
      vi.mocked(attractionRepo.duplicate).mockResolvedValue(sampleAttraction);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', attractionId: '100' },
      });

      await duplicateAttraction(req, res);

      expect(attractionRepo.getDayIdForAttraction).toHaveBeenCalledWith(100);
      expect(attractionRepo.duplicate).toHaveBeenCalledWith(100, 10);
      expectJsonStatus(res, 201, sampleAttraction);
    });
  });

  describe('reorderAttractions', () => {
    it.each([
      { name: 'orderedIds is missing', body: {} },
      {
        name: 'orderedIds is not an array',
        body: { orderedIds: 'not-an-array' },
      },
    ])('returns 400 when $name', async ({ body }) => {
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body,
      });

      await reorderAttractions(req, res);

      expectJsonStatus(res, 400, { error: 'orderedIds array is required' });
      expect(tripRepo.findDayByIdAndTripId).not.toHaveBeenCalled();
    });

    it('returns 404 when the day is not found', async () => {
      vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body: { orderedIds: [100, 101] },
      });

      await reorderAttractions(req, res);

      expectJsonStatus(res, 404, { error: 'Day not found' });
    });

    it('reorders the attractions and responds with 204', async () => {
      vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(sampleDay);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body: { orderedIds: [100, 101] },
      });

      await reorderAttractions(req, res);

      expect(attractionRepo.updateOrder).toHaveBeenCalledWith(10, [100, 101]);
      expectNoContent(res);
    });
  });
});

describe('500 error handling', () => {
  const rejection = new Error('unexpected failure');

  const cases: Array<{
    name: string;
    handler: (
      req: Parameters<typeof addAttraction>[0],
      res: Parameters<typeof addAttraction>[1],
    ) => Promise<void>;
    req: Parameters<typeof createMockReqRes>[0];
    arrange: () => void;
    expectedError: string;
  }> = [
    {
      name: 'addAttraction',
      handler: addAttraction,
      req: {
        params: { tripId: '1', dayId: '10' },
        body: { name: 'Fushimi Inari' },
      },
      arrange: () =>
        vi.mocked(tripRepo.findDayByIdAndTripId).mockRejectedValue(rejection),
      expectedError: 'Failed to add attraction',
    },
    {
      name: 'updateAttraction',
      handler: updateAttraction,
      req: {
        params: { tripId: '1', attractionId: '100' },
        body: { name: 'Updated' },
      },
      arrange: () =>
        vi
          .mocked(attractionRepo.verifyBelongsToTrip)
          .mockRejectedValue(rejection),
      expectedError: 'Failed to update attraction',
    },
    {
      name: 'deleteAttraction',
      handler: deleteAttraction,
      req: { params: { tripId: '1', attractionId: '100' } },
      arrange: () =>
        vi
          .mocked(attractionRepo.verifyBelongsToTrip)
          .mockRejectedValue(rejection),
      expectedError: 'Failed to delete attraction',
    },
    {
      name: 'duplicateAttraction',
      handler: duplicateAttraction,
      req: { params: { tripId: '1', attractionId: '100' } },
      arrange: () =>
        vi
          .mocked(attractionRepo.verifyBelongsToTrip)
          .mockRejectedValue(rejection),
      expectedError: 'Failed to duplicate attraction',
    },
    {
      name: 'reorderAttractions',
      handler: reorderAttractions,
      req: {
        params: { tripId: '1', dayId: '10' },
        body: { orderedIds: [100, 101] },
      },
      arrange: () =>
        vi.mocked(tripRepo.findDayByIdAndTripId).mockRejectedValue(rejection),
      expectedError: 'Failed to reorder attractions',
    },
  ];

  it.each(cases)(
    'returns 500 when $name encounters an unexpected error',
    async ({ handler, req, arrange, expectedError }) => {
      arrange();
      const { req: mockReq, res } = createMockReqRes(req);

      await handler(mockReq, res);

      expectJsonStatus(res, 500, { error: expectedError });
    },
  );
});
