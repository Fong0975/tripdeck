import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../repositories/attraction');
vi.mock('../repositories/connectionRepository');
vi.mock('../repositories/trip');

import * as attractionRepo from '../repositories/attraction';
import * as connectionRepo from '../repositories/connectionRepository';
import * as tripRepo from '../repositories/trip';
import { createMockReqRes, expectJsonStatus } from '../test-utils/httpMocks';
import type {
  AttractionResponse,
  ConnectionResponse,
  DayLocation,
  TripContentResponse,
  TripResponse,
} from '../types/trip';

import {
  addAttraction,
  addConnection,
  addDayLocation,
  createTrip,
  deleteAttraction,
  deleteConnection,
  deleteDayLocation,
  deleteTrip,
  duplicateAttraction,
  getTrip,
  getTripContent,
  getTrips,
  reorderAttractions,
  updateAttraction,
  updateConnection,
  updateDayLocation,
} from './tripController';

const sampleTrip: TripResponse = {
  id: 1,
  title: 'Kyoto Trip',
  destination: 'Kyoto',
  startDate: '2024-05-10',
  endDate: '2024-05-12',
  description: null,
  createdAt: '2024-01-01T00:00:00.000Z',
};

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

const sampleLocation: DayLocation = {
  id: 300,
  name: 'Kyoto Station',
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
    {
      name: 'addDayLocation',
      handler: addDayLocation,
      req: {
        params: { tripId: '1', dayId: '10' },
        body: { name: 'Kyoto Station' },
      },
      arrange: () =>
        vi.mocked(tripRepo.findDayByIdAndTripId).mockRejectedValue(rejection),
      expectedError: 'Failed to add location',
    },
    {
      name: 'updateDayLocation',
      handler: updateDayLocation,
      req: {
        params: { tripId: '1', locationId: '300' },
        body: { name: 'Updated Location' },
      },
      arrange: () => vi.mocked(tripRepo.findById).mockRejectedValue(rejection),
      expectedError: 'Failed to update location',
    },
    {
      name: 'deleteDayLocation',
      handler: deleteDayLocation,
      req: { params: { tripId: '1', locationId: '300' } },
      arrange: () => vi.mocked(tripRepo.findById).mockRejectedValue(rejection),
      expectedError: 'Failed to delete location',
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
