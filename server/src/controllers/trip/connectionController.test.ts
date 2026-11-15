import type { TravelConnection } from '@tripdeck/shared';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/connection', () => ({
  attractionsBelongToDay: vi.fn(),
  create: vi.fn(),
  deleteById: vi.fn(),
  findEndpointsInTrip: vi.fn(),
  update: vi.fn(),
  verifyBelongsToTrip: vi.fn(),
}));
vi.mock('../../repositories/trip', () => ({
  findDayByIdAndTripId: vi.fn(),
}));

import * as connectionRepo from '../../repositories/connection';
import * as tripRepo from '../../repositories/trip';
import {
  createMockReqRes,
  expectJsonStatus,
  itRejects,
  type RejectCase,
} from '../../test-utils/httpMocks';

import {
  addConnection,
  deleteConnection,
  updateConnection,
} from './connectionController';
import {
  ENDPOINTS_NOT_IN_DAY_ERROR,
  INVALID_ENDPOINT_IDS_ERROR,
  INVALID_TRANSPORT_MODE_ERROR,
  SAME_ENDPOINT_ERROR,
} from './connectionValidation';

const sampleDay = { id: 10, day: 1, date: '2024-05-10' };

const currentEndpoints = {
  dayId: 10,
  fromAttractionId: 100,
  toAttractionId: 101,
};

const sampleConnection: TravelConnection = {
  id: 200,
  fromAttractionId: 100,
  toAttractionId: 101,
  transportMode: 'walk',
  duration: null,
  route: null,
  notes: null,
  images: [],
};

function expectNoContent(
  res: ReturnType<typeof createMockReqRes>['res'],
): void {
  expect(res.status).toHaveBeenCalledWith(204);
  expect(res.send).toHaveBeenCalled();
}

describe('Connections', () => {
  const validConnectionBody = {
    fromAttractionId: 100,
    toAttractionId: 101,
    transportMode: 'walk',
  };

  describe('addConnection', () => {
    it.each([
      {
        name: 'fromAttractionId is missing',
        body: { toAttractionId: 101, transportMode: 'walk' },
      },
      {
        name: 'toAttractionId is missing',
        body: { fromAttractionId: 100, transportMode: 'walk' },
      },
      {
        name: 'transportMode is missing',
        body: { fromAttractionId: 100, toAttractionId: 101 },
      },
    ])('returns 400 when $name', async ({ body }) => {
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body,
      });

      await addConnection(req, res);

      expectJsonStatus(res, 400, {
        error:
          'fromAttractionId, toAttractionId, and transportMode are required',
      });
      expect(tripRepo.findDayByIdAndTripId).not.toHaveBeenCalled();
    });

    it.each([
      {
        name: 'fromAttractionId is not a positive integer',
        params: { tripId: '1', dayId: '10' },
        body: { ...validConnectionBody, fromAttractionId: 1.5 },
        error: INVALID_ENDPOINT_IDS_ERROR,
      },
      {
        name: 'toAttractionId is not numeric',
        params: { tripId: '1', dayId: '10' },
        body: { ...validConnectionBody, toAttractionId: 'abc' },
        error: INVALID_ENDPOINT_IDS_ERROR,
      },
      {
        name: 'fromAttractionId equals toAttractionId',
        params: { tripId: '1', dayId: '10' },
        body: { ...validConnectionBody, toAttractionId: 100 },
        error: SAME_ENDPOINT_ERROR,
      },
      {
        name: 'transportMode is unknown',
        params: { tripId: '1', dayId: '10' },
        body: { ...validConnectionBody, transportMode: 'teleport' },
        error: INVALID_TRANSPORT_MODE_ERROR,
      },
      {
        name: 'duration is longer than 100 characters',
        params: { tripId: '1', dayId: '10' },
        body: { ...validConnectionBody, duration: 'x'.repeat(101) },
        error: 'duration must be at most 100 characters',
      },
    ])(
      'returns 400 before touching the database when $name',
      async ({ params, body, error }) => {
        const { req, res } = createMockReqRes({ params, body });

        await addConnection(req, res);

        expectJsonStatus(res, 400, { error });
        expect(tripRepo.findDayByIdAndTripId).not.toHaveBeenCalled();
        expect(connectionRepo.create).not.toHaveBeenCalled();
      },
    );

    it('returns 400 when the attractions do not belong to the day', async () => {
      vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(sampleDay);
      vi.mocked(connectionRepo.attractionsBelongToDay).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body: validConnectionBody,
      });

      await addConnection(req, res);

      expect(connectionRepo.attractionsBelongToDay).toHaveBeenCalledWith(
        10,
        100,
        101,
      );
      expectJsonStatus(res, 400, { error: ENDPOINTS_NOT_IN_DAY_ERROR });
      expect(connectionRepo.create).not.toHaveBeenCalled();
    });

    it('returns 404 when the day is not found', async () => {
      vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body: validConnectionBody,
      });

      await addConnection(req, res);

      expectJsonStatus(res, 404, { error: 'Day not found' });
    });

    it.each([
      { name: 'numeric ids', body: validConnectionBody },
      {
        name: 'digit-string ids',
        body: {
          ...validConnectionBody,
          fromAttractionId: '100',
          toAttractionId: '101',
        },
      },
    ])(
      'creates the connection with $name and responds with 201',
      async ({ body }) => {
        vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(sampleDay);
        vi.mocked(connectionRepo.attractionsBelongToDay).mockResolvedValue(
          true,
        );
        vi.mocked(connectionRepo.create).mockResolvedValue(sampleConnection);
        const { req, res } = createMockReqRes({
          params: { tripId: '1', dayId: '10' },
          body,
        });

        await addConnection(req, res);

        expect(connectionRepo.create).toHaveBeenCalledWith(
          10,
          validConnectionBody,
        );
        expectJsonStatus(res, 201, sampleConnection);
      },
    );
  });

  describe('updateConnection', () => {
    it.each([
      {
        name: 'transportMode is unknown',
        params: { tripId: '1', connectionId: '200' },
        body: { transportMode: 'car' },
        error: INVALID_TRANSPORT_MODE_ERROR,
      },
      {
        name: 'duration is longer than 100 characters',
        params: { tripId: '1', connectionId: '200' },
        body: { duration: 'x'.repeat(101) },
        error: 'duration must be at most 100 characters',
      },
    ])(
      'returns 400 before touching the database when $name',
      async ({ params, body, error }) => {
        const { req, res } = createMockReqRes({ params, body });

        await updateConnection(req, res);

        expectJsonStatus(res, 400, { error });
        expect(connectionRepo.findEndpointsInTrip).not.toHaveBeenCalled();
        expect(connectionRepo.update).not.toHaveBeenCalled();
      },
    );

    it.each([
      {
        name: 'fromAttractionId is invalid',
        body: { fromAttractionId: 0 },
        error: INVALID_ENDPOINT_IDS_ERROR,
      },
      {
        name: 'the new toAttractionId equals the current fromAttractionId',
        body: { toAttractionId: 100 },
        error: SAME_ENDPOINT_ERROR,
      },
    ])('returns 400 when $name', async ({ body, error }) => {
      vi.mocked(connectionRepo.findEndpointsInTrip).mockResolvedValue(
        currentEndpoints,
      );
      const { req, res } = createMockReqRes({
        params: { tripId: '1', connectionId: '200' },
        body,
      });

      await updateConnection(req, res);

      expectJsonStatus(res, 400, { error });
      expect(connectionRepo.attractionsBelongToDay).not.toHaveBeenCalled();
      expect(connectionRepo.update).not.toHaveBeenCalled();
    });

    it('returns 400 when a new endpoint does not belong to the connection day', async () => {
      vi.mocked(connectionRepo.findEndpointsInTrip).mockResolvedValue(
        currentEndpoints,
      );
      vi.mocked(connectionRepo.attractionsBelongToDay).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', connectionId: '200' },
        body: { toAttractionId: 999 },
      });

      await updateConnection(req, res);

      expect(connectionRepo.attractionsBelongToDay).toHaveBeenCalledWith(
        10,
        100,
        999,
      );
      expectJsonStatus(res, 400, { error: ENDPOINTS_NOT_IN_DAY_ERROR });
      expect(connectionRepo.update).not.toHaveBeenCalled();
    });

    it('returns 404 when the connection does not belong to the trip', async () => {
      vi.mocked(connectionRepo.findEndpointsInTrip).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', connectionId: '200' },
        body: { transportMode: 'walk' },
      });

      await updateConnection(req, res);

      expectJsonStatus(res, 404, { error: 'Connection not found' });
      expect(connectionRepo.update).not.toHaveBeenCalled();
    });

    it('returns 404 when the update finds nothing to update', async () => {
      vi.mocked(connectionRepo.findEndpointsInTrip).mockResolvedValue(
        currentEndpoints,
      );
      vi.mocked(connectionRepo.update).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', connectionId: '200' },
        body: { transportMode: 'walk' },
      });

      await updateConnection(req, res);

      expectJsonStatus(res, 404, { error: 'Connection not found' });
    });

    it.each([
      {
        name: 'without endpoint changes',
        body: { transportMode: 'walk' },
        expectedData: { transportMode: 'walk' },
        checksDay: false,
      },
      {
        name: 'with a new endpoint merged against the current one',
        body: { fromAttractionId: '102' },
        expectedData: { fromAttractionId: 102, toAttractionId: 101 },
        checksDay: true,
      },
    ])(
      'updates the connection $name and responds with 200',
      async ({ body, expectedData, checksDay }) => {
        vi.mocked(connectionRepo.findEndpointsInTrip).mockResolvedValue(
          currentEndpoints,
        );
        vi.mocked(connectionRepo.attractionsBelongToDay).mockResolvedValue(
          true,
        );
        vi.mocked(connectionRepo.update).mockResolvedValue(sampleConnection);
        const { req, res } = createMockReqRes({
          params: { tripId: '1', connectionId: '200' },
          body,
        });

        await updateConnection(req, res);

        expect(connectionRepo.update).toHaveBeenCalledWith(200, expectedData);
        expect(connectionRepo.attractionsBelongToDay).toHaveBeenCalledTimes(
          checksDay ? 1 : 0,
        );
        expect(res.json).toHaveBeenCalledWith(sampleConnection);
        expect(res.status).not.toHaveBeenCalled();
      },
    );
  });

  describe('deleteConnection', () => {
    it('returns 404 when the connection does not belong to the trip', async () => {
      vi.mocked(connectionRepo.verifyBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', connectionId: '200' },
      });

      await deleteConnection(req, res);

      expectJsonStatus(res, 404, { error: 'Connection not found' });
      expect(connectionRepo.deleteById).not.toHaveBeenCalled();
    });

    it('deletes the connection and responds with 204', async () => {
      vi.mocked(connectionRepo.verifyBelongsToTrip).mockResolvedValue(true);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', connectionId: '200' },
      });

      await deleteConnection(req, res);

      expectNoContent(res);
    });
  });
});

describe('unexpected errors', () => {
  const cases: RejectCase[] = [
    {
      name: 'addConnection',
      handler: addConnection,
      req: {
        params: { tripId: '1', dayId: '10' },
        body: {
          fromAttractionId: 100,
          toAttractionId: 101,
          transportMode: 'walk',
        },
      },
      arrange: error =>
        vi.mocked(tripRepo.findDayByIdAndTripId).mockRejectedValue(error),
    },
    {
      name: 'updateConnection',
      handler: updateConnection,
      req: {
        params: { tripId: '1', connectionId: '200' },
        body: { transportMode: 'walk' },
      },
      arrange: error =>
        vi.mocked(connectionRepo.findEndpointsInTrip).mockRejectedValue(error),
    },
    {
      name: 'deleteConnection',
      handler: deleteConnection,
      req: { params: { tripId: '1', connectionId: '200' } },
      arrange: error =>
        vi.mocked(connectionRepo.verifyBelongsToTrip).mockRejectedValue(error),
    },
  ];

  itRejects(cases);
});
