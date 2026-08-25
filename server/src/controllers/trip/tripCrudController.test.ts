import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/trip');

import * as tripRepo from '../../repositories/trip';
import { createMockReqRes, expectJsonStatus } from '../../test-utils/httpMocks';
import type { TripContentResponse, TripResponse } from '../../types/trip';

import {
  createTrip,
  deleteTrip,
  getTrip,
  getTripContent,
  getTrips,
  updateTrip,
} from './tripCrudController';

const sampleTrip: TripResponse = {
  id: 1,
  title: 'Kyoto Trip',
  destination: 'Kyoto',
  startDate: '2024-05-10',
  endDate: '2024-05-12',
  description: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  images: [],
};

const sampleTripContent: TripContentResponse = {
  tripId: 1,
  days: [],
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

describe('Trips', () => {
  describe('getTrips', () => {
    it('responds with the array of trips', async () => {
      vi.mocked(tripRepo.findAll).mockResolvedValue([sampleTrip]);
      const { req, res } = createMockReqRes();

      await getTrips(req, res);

      expect(res.json).toHaveBeenCalledWith([sampleTrip]);
    });
  });

  describe('getTrip', () => {
    it('returns 404 when the trip is not found', async () => {
      vi.mocked(tripRepo.findById).mockResolvedValue(null);
      const { req, res } = createMockReqRes({ params: { tripId: '1' } });

      await getTrip(req, res);

      expectJsonStatus(res, 404, { error: 'Trip not found' });
    });

    it('returns the trip when found', async () => {
      vi.mocked(tripRepo.findById).mockResolvedValue(sampleTrip);
      const { req, res } = createMockReqRes({ params: { tripId: '1' } });

      await getTrip(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleTrip);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('createTrip', () => {
    it.each([
      {
        name: 'title is missing',
        body: { startDate: '2024-05-10', endDate: '2024-05-12' },
      },
      {
        name: 'startDate is missing',
        body: { title: 'Kyoto Trip', endDate: '2024-05-12' },
      },
      {
        name: 'endDate is missing',
        body: { title: 'Kyoto Trip', startDate: '2024-05-10' },
      },
    ])('returns 400 when $name', async ({ body }) => {
      const { req, res } = createMockReqRes({ body });

      await createTrip(req, res);

      expectJsonStatus(res, 400, {
        error: 'title, startDate, and endDate are required',
      });
      expect(tripRepo.create).not.toHaveBeenCalled();
    });

    it('creates the trip and responds with 201', async () => {
      vi.mocked(tripRepo.create).mockResolvedValue(sampleTrip);
      const { req, res } = createMockReqRes({
        body: {
          title: 'Kyoto Trip',
          startDate: '2024-05-10',
          endDate: '2024-05-12',
        },
      });

      await createTrip(req, res);

      expectJsonStatus(res, 201, sampleTrip);
    });
  });

  describe('updateTrip', () => {
    it('returns 404 when the trip is not found', async () => {
      vi.mocked(tripRepo.findById).mockResolvedValue(null);
      const { req, res } = createMockReqRes({
        params: { tripId: '1' },
        body: { title: 'New Title' },
      });

      await updateTrip(req, res);

      expectJsonStatus(res, 404, { error: 'Trip not found' });
      expect(tripRepo.update).not.toHaveBeenCalled();
    });

    it('returns 400 when title is provided but empty', async () => {
      vi.mocked(tripRepo.findById).mockResolvedValue(sampleTrip);
      const { req, res } = createMockReqRes({
        params: { tripId: '1' },
        body: { title: '   ' },
      });

      await updateTrip(req, res);

      expectJsonStatus(res, 400, { error: 'title cannot be empty' });
      expect(tripRepo.update).not.toHaveBeenCalled();
    });

    it('returns 400 when the provided endDate is before the provided startDate', async () => {
      vi.mocked(tripRepo.findById).mockResolvedValue(sampleTrip);
      const { req, res } = createMockReqRes({
        params: { tripId: '1' },
        body: { startDate: '2024-05-12', endDate: '2024-05-10' },
      });

      await updateTrip(req, res);

      expectJsonStatus(res, 400, {
        error: 'endDate cannot be before startDate',
      });
      expect(tripRepo.update).not.toHaveBeenCalled();
    });

    it('returns 400 when a new startDate falls after the existing endDate', async () => {
      vi.mocked(tripRepo.findById).mockResolvedValue(sampleTrip);
      const { req, res } = createMockReqRes({
        params: { tripId: '1' },
        body: { startDate: '2024-05-20' },
      });

      await updateTrip(req, res);

      expectJsonStatus(res, 400, {
        error: 'endDate cannot be before startDate',
      });
      expect(tripRepo.update).not.toHaveBeenCalled();
    });

    it('updates the trip and responds with 200', async () => {
      vi.mocked(tripRepo.findById).mockResolvedValue(sampleTrip);
      const updated = { ...sampleTrip, title: 'New Title' };
      vi.mocked(tripRepo.update).mockResolvedValue(updated);
      const { req, res } = createMockReqRes({
        params: { tripId: '1' },
        body: { title: 'New Title' },
      });

      await updateTrip(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('deleteTrip', () => {
    it('returns 404 when the trip is not found', async () => {
      vi.mocked(tripRepo.deleteById).mockResolvedValue(false);
      const { req, res } = createMockReqRes({ params: { tripId: '1' } });

      await deleteTrip(req, res);

      expectJsonStatus(res, 404, { error: 'Trip not found' });
    });

    it('deletes the trip and responds with 204', async () => {
      vi.mocked(tripRepo.deleteById).mockResolvedValue(true);
      const { req, res } = createMockReqRes({ params: { tripId: '1' } });

      await deleteTrip(req, res);

      expectNoContent(res);
    });
  });
});

describe('Trip content', () => {
  describe('getTripContent', () => {
    it('returns 404 when the trip is not found', async () => {
      vi.mocked(tripRepo.findContent).mockResolvedValue(null);
      const { req, res } = createMockReqRes({ params: { tripId: '1' } });

      await getTripContent(req, res);

      expectJsonStatus(res, 404, { error: 'Trip not found' });
    });

    it('returns the trip content when found', async () => {
      vi.mocked(tripRepo.findContent).mockResolvedValue(sampleTripContent);
      const { req, res } = createMockReqRes({ params: { tripId: '1' } });

      await getTripContent(req, res);

      expect(res.json).toHaveBeenCalledWith(sampleTripContent);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

describe('500 error handling', () => {
  const rejection = new Error('unexpected failure');

  const cases: Array<{
    name: string;
    handler: (
      req: Parameters<typeof getTrips>[0],
      res: Parameters<typeof getTrips>[1],
    ) => Promise<void>;
    req: Parameters<typeof createMockReqRes>[0];
    arrange: () => void;
    expectedError: string;
  }> = [
    {
      name: 'getTrips',
      handler: getTrips,
      req: {},
      arrange: () => vi.mocked(tripRepo.findAll).mockRejectedValue(rejection),
      expectedError: 'Failed to fetch trips',
    },
    {
      name: 'getTrip',
      handler: getTrip,
      req: { params: { tripId: '1' } },
      arrange: () => vi.mocked(tripRepo.findById).mockRejectedValue(rejection),
      expectedError: 'Failed to fetch trip',
    },
    {
      name: 'createTrip',
      handler: createTrip,
      req: {
        body: {
          title: 'Kyoto Trip',
          startDate: '2024-05-10',
          endDate: '2024-05-12',
        },
      },
      arrange: () => vi.mocked(tripRepo.create).mockRejectedValue(rejection),
      expectedError: 'Failed to create trip',
    },
    {
      name: 'updateTrip',
      handler: updateTrip,
      req: { params: { tripId: '1' }, body: { title: 'New Title' } },
      arrange: () => {
        vi.mocked(tripRepo.findById).mockResolvedValue(sampleTrip);
        vi.mocked(tripRepo.update).mockRejectedValue(rejection);
      },
      expectedError: 'Failed to update trip',
    },
    {
      name: 'deleteTrip',
      handler: deleteTrip,
      req: { params: { tripId: '1' } },
      arrange: () =>
        vi.mocked(tripRepo.deleteById).mockRejectedValue(rejection),
      expectedError: 'Failed to delete trip',
    },
    {
      name: 'getTripContent',
      handler: getTripContent,
      req: { params: { tripId: '1' } },
      arrange: () =>
        vi.mocked(tripRepo.findContent).mockRejectedValue(rejection),
      expectedError: 'Failed to fetch trip content',
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
