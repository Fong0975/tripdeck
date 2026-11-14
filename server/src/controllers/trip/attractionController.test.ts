import { describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/attraction', () => ({
  create: vi.fn(),
  deleteById: vi.fn(),
  duplicate: vi.fn(),
  getDayIdForAttraction: vi.fn(),
  moveToDay: vi.fn(),
  update: vi.fn(),
  updateOrder: vi.fn(),
  verifyBelongsToTrip: vi.fn(),
}));
vi.mock('../../repositories/trip', () => ({
  findDayByIdAndTripId: vi.fn(),
}));

import * as attractionRepo from '../../repositories/attraction';
import * as tripRepo from '../../repositories/trip';
import {
  createMockReqRes,
  expectJsonStatus,
  type Returns500Case,
} from '../../test-utils/httpMocks';
import type { AttractionResponse } from '../../types/trip';

import {
  addAttraction,
  deleteAttraction,
  duplicateAttraction,
  moveAttraction,
  reorderAttractions,
  updateAttraction,
} from './attractionController';

type RejectCase = Omit<Returns500Case, 'expectedError'>;

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
    it('returns 400 when orderedIds is not an array', async () => {
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body: { orderedIds: 'not-an-array' },
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

  describe('moveAttraction', () => {
    const validParams = { tripId: '1', attractionId: '100' };

    it.each([
      {
        name: 'dayId is missing',
        params: validParams,
        body: { index: 0 },
      },
      {
        name: 'dayId is not a positive integer',
        params: validParams,
        body: { dayId: -3, index: 0 },
      },
      {
        name: 'index is missing',
        params: validParams,
        body: { dayId: 20 },
      },
      {
        name: 'index is negative',
        params: validParams,
        body: { dayId: 20, index: -1 },
      },
      {
        name: 'index is not an integer',
        params: validParams,
        body: { dayId: 20, index: 1.5 },
      },
      {
        name: 'index is a numeric string',
        params: validParams,
        body: { dayId: 20, index: '1' },
      },
      {
        name: 'the body is missing',
        params: validParams,
        body: undefined,
      },
    ])('returns 400 when $name', async ({ params, body }) => {
      const { req, res } = createMockReqRes({ params, body });

      await moveAttraction(req, res);

      expectJsonStatus(res, 400, {
        error:
          'dayId must be a positive integer and index a non-negative integer',
      });
      expect(attractionRepo.moveToDay).not.toHaveBeenCalled();
    });

    it.each([
      {
        result: 'attraction_not_found' as const,
        status: 404,
        error: 'Attraction not found',
      },
      { result: 'day_not_found' as const, status: 404, error: 'Day not found' },
    ])(
      'responds $status when the repository returns $result',
      async ({ result, status, error }) => {
        vi.mocked(attractionRepo.moveToDay).mockResolvedValue(result);
        const { req, res } = createMockReqRes({
          params: validParams,
          body: { dayId: 20, index: 2 },
        });

        await moveAttraction(req, res);

        expectJsonStatus(res, status, { error });
      },
    );

    it('moves the attraction and responds with 204', async () => {
      vi.mocked(attractionRepo.moveToDay).mockResolvedValue('moved');
      const { req, res } = createMockReqRes({
        params: validParams,
        body: { dayId: 20, index: 0 },
      });

      await moveAttraction(req, res);

      expect(attractionRepo.moveToDay).toHaveBeenCalledWith(1, 100, 20, 0);
      expectNoContent(res);
    });
  });
});

describe('unexpected errors', () => {
  const cases: RejectCase[] = [
    {
      name: 'addAttraction',
      handler: addAttraction,
      req: {
        params: { tripId: '1', dayId: '10' },
        body: { name: 'Fushimi Inari' },
      },
      arrange: error =>
        vi.mocked(tripRepo.findDayByIdAndTripId).mockRejectedValue(error),
    },
    {
      name: 'updateAttraction',
      handler: updateAttraction,
      req: {
        params: { tripId: '1', attractionId: '100' },
        body: { name: 'Updated' },
      },
      arrange: error =>
        vi.mocked(attractionRepo.verifyBelongsToTrip).mockRejectedValue(error),
    },
    {
      name: 'deleteAttraction',
      handler: deleteAttraction,
      req: { params: { tripId: '1', attractionId: '100' } },
      arrange: error =>
        vi.mocked(attractionRepo.verifyBelongsToTrip).mockRejectedValue(error),
    },
    {
      name: 'duplicateAttraction',
      handler: duplicateAttraction,
      req: { params: { tripId: '1', attractionId: '100' } },
      arrange: error =>
        vi.mocked(attractionRepo.verifyBelongsToTrip).mockRejectedValue(error),
    },
    {
      name: 'reorderAttractions',
      handler: reorderAttractions,
      req: {
        params: { tripId: '1', dayId: '10' },
        body: { orderedIds: [100, 101] },
      },
      arrange: error =>
        vi.mocked(tripRepo.findDayByIdAndTripId).mockRejectedValue(error),
    },
    {
      name: 'moveAttraction',
      handler: moveAttraction,
      req: {
        params: { tripId: '1', attractionId: '100' },
        body: { dayId: 20, index: 0 },
      },
      arrange: error =>
        vi.mocked(attractionRepo.moveToDay).mockRejectedValue(error),
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
