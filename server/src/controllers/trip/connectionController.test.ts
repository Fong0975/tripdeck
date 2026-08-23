import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/connectionRepository');
vi.mock('../../repositories/trip');

import * as connectionRepo from '../../repositories/connectionRepository';
import * as tripRepo from '../../repositories/trip';
import { createMockReqRes, expectJsonStatus } from '../../test-utils/httpMocks';
import type { ConnectionResponse } from '../../types/trip';

import {
  addConnection,
  deleteConnection,
  updateConnection,
} from './connectionController';

const sampleDay = { id: 10, day: 1, date: '2024-05-10' };

const sampleConnection: ConnectionResponse = {
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

beforeEach(() => {
  vi.clearAllMocks();
});

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

    it('returns 404 when the day is not found', async () => {
      vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body: validConnectionBody,
      });

      await addConnection(req, res);

      expectJsonStatus(res, 404, { error: 'Day not found' });
    });

    it('creates the connection and responds with 201', async () => {
      vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(sampleDay);
      vi.mocked(connectionRepo.create).mockResolvedValue(sampleConnection);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', dayId: '10' },
        body: validConnectionBody,
      });

      await addConnection(req, res);

      expect(connectionRepo.create).toHaveBeenCalledWith(
        10,
        validConnectionBody,
      );
      expectJsonStatus(res, 201, sampleConnection);
    });
  });

  describe('updateConnection', () => {
    it('returns 404 when the connection does not belong to the trip', async () => {
      vi.mocked(connectionRepo.verifyBelongsToTrip).mockResolvedValue(false);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', connectionId: '200' },
        body: { transportMode: 'walk' },
      });

      await updateConnection(req, res);

      expectJsonStatus(res, 404, { error: 'Connection not found' });
      expect(connectionRepo.update).not.toHaveBeenCalled();
    });

    it('returns 404 when the update finds nothing to update', async () => {
      vi.mocked(connectionRepo.verifyBelongsToTrip).mockResolvedValue(true);
      vi.mocked(connectionRepo.update).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', connectionId: '200' },
        body: { transportMode: 'walk' },
      });

      await updateConnection(req, res);

      expectJsonStatus(res, 404, { error: 'Connection not found' });
    });

    it('updates the connection and responds with 200', async () => {
      vi.mocked(connectionRepo.verifyBelongsToTrip).mockResolvedValue(true);
      vi.mocked(connectionRepo.update).mockResolvedValue(sampleConnection);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', connectionId: '200' },
        body: { transportMode: 'walk' },
      });

      await updateConnection(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleConnection);
      expect(res.status).not.toHaveBeenCalled();
    });
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

describe('500 error handling', () => {
  const rejection = new Error('unexpected failure');

  const cases: Array<{
    name: string;
    handler: (
      req: Parameters<typeof addConnection>[0],
      res: Parameters<typeof addConnection>[1],
    ) => Promise<void>;
    req: Parameters<typeof createMockReqRes>[0];
    arrange: () => void;
    expectedError: string;
  }> = [
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
      arrange: () =>
        vi.mocked(tripRepo.findDayByIdAndTripId).mockRejectedValue(rejection),
      expectedError: 'Failed to add connection',
    },
    {
      name: 'updateConnection',
      handler: updateConnection,
      req: {
        params: { tripId: '1', connectionId: '200' },
        body: { transportMode: 'walk' },
      },
      arrange: () =>
        vi
          .mocked(connectionRepo.verifyBelongsToTrip)
          .mockRejectedValue(rejection),
      expectedError: 'Failed to update connection',
    },
    {
      name: 'deleteConnection',
      handler: deleteConnection,
      req: { params: { tripId: '1', connectionId: '200' } },
      arrange: () =>
        vi
          .mocked(connectionRepo.verifyBelongsToTrip)
          .mockRejectedValue(rejection),
      expectedError: 'Failed to delete connection',
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
