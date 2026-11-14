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

const WEBSITES_ERROR =
  'referenceWebsites must be an array of { url: string, title: string }';

/** Bodies rejected by both add and update before touching the repository. */
const invalidBodyCases: {
  name: string;
  body: Record<string, unknown>;
  error: string;
}[] = [
  {
    name: 'name exceeds 255 characters',
    body: { name: 'n'.repeat(256) },
    error: 'name must be at most 255 characters',
  },
  {
    name: 'startTime exceeds 10 characters',
    body: { startTime: 't'.repeat(11) },
    error: 'startTime must be at most 10 characters',
  },
  {
    name: 'endTime exceeds 10 characters',
    body: { endTime: 't'.repeat(11) },
    error: 'endTime must be at most 10 characters',
  },
  {
    name: 'a reference website title exceeds 255 characters',
    body: {
      referenceWebsites: [
        { url: 'https://a.com', title: 'ok' },
        { url: 'https://b.com', title: 'w'.repeat(256) },
      ],
    },
    error: 'referenceWebsites[1].title must be at most 255 characters',
  },
  {
    name: 'referenceWebsites is not an array',
    body: { referenceWebsites: 'https://a.com' },
    error: WEBSITES_ERROR,
  },
  {
    name: 'a reference website has no url',
    body: { referenceWebsites: [{ title: 'A' }] },
    error: WEBSITES_ERROR,
  },
  {
    name: 'a reference website title is not a string',
    body: { referenceWebsites: [{ url: 'https://a.com', title: 5 }] },
    error: WEBSITES_ERROR,
  },
  {
    name: 'a reference website is null',
    body: { referenceWebsites: [null] },
    error: WEBSITES_ERROR,
  },
];

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

    it.each(invalidBodyCases)(
      'returns 400 when $name',
      async ({ body, error }) => {
        const { req, res } = createMockReqRes({
          params: { tripId: '1', dayId: '10' },
          body: { name: 'Fushimi Inari', ...body },
        });

        await addAttraction(req, res);

        expectJsonStatus(res, 400, { error });
        expect(tripRepo.findDayByIdAndTripId).not.toHaveBeenCalled();
        expect(attractionRepo.create).not.toHaveBeenCalled();
      },
    );

    it('accepts fields exactly at their maximum length', async () => {
      vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(sampleDay);
      vi.mocked(attractionRepo.create).mockResolvedValue(sampleAttraction);
      const body = {
        name: 'n'.repeat(255),
        startTime: 't'.repeat(10),
        endTime: 't'.repeat(10),
        referenceWebsites: [{ url: 'https://a.com', title: 'w'.repeat(255) }],
      };
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body,
      });

      await addAttraction(req, res);

      expect(attractionRepo.create).toHaveBeenCalledWith(10, body);
      expectJsonStatus(res, 201, sampleAttraction);
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
    it.each(invalidBodyCases)(
      'returns 400 when $name',
      async ({ body, error }) => {
        const { req, res } = createMockReqRes({
          params: { tripId: '1', attractionId: '100' },
          body,
        });

        await updateAttraction(req, res);

        expectJsonStatus(res, 400, { error });
        expect(attractionRepo.verifyBelongsToTrip).not.toHaveBeenCalled();
        expect(attractionRepo.update).not.toHaveBeenCalled();
      },
    );

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
    it.each<{ name: string; body: unknown; error: string }>([
      {
        name: 'orderedIds is not an array',
        body: { orderedIds: 'not-an-array' },
        error: 'orderedIds array is required',
      },
      {
        name: 'orderedIds is missing',
        body: {},
        error: 'orderedIds array is required',
      },
      {
        name: 'the body is missing',
        body: undefined,
        error: 'orderedIds array is required',
      },
      {
        name: 'an id is a numeric string',
        body: { orderedIds: [100, '101'] },
        error: 'orderedIds must contain only positive integers',
      },
      {
        name: 'an id is not an integer',
        body: { orderedIds: [100, 101.5] },
        error: 'orderedIds must contain only positive integers',
      },
      {
        name: 'an id is zero',
        body: { orderedIds: [0, 101] },
        error: 'orderedIds must contain only positive integers',
      },
    ])('returns 400 when $name', async ({ body, error }) => {
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body,
      });

      await reorderAttractions(req, res);

      expectJsonStatus(res, 400, { error });
      expect(tripRepo.findDayByIdAndTripId).not.toHaveBeenCalled();
      expect(attractionRepo.updateOrder).not.toHaveBeenCalled();
    });

    it('returns 400 when the ids do not match the day attractions', async () => {
      vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(sampleDay);
      vi.mocked(attractionRepo.updateOrder).mockResolvedValue('invalid_order');
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body: { orderedIds: [100] },
      });

      await reorderAttractions(req, res);

      expect(attractionRepo.updateOrder).toHaveBeenCalledWith(10, [100]);
      expectJsonStatus(res, 400, {
        error: 'orderedIds must list every attraction of the day exactly once',
      });
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
      vi.mocked(attractionRepo.updateOrder).mockResolvedValue('reordered');
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
