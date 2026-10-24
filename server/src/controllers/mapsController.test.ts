import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isMapsEnabled: vi.fn(),
  getUsage: vi.fn(),
  markExhausted: vi.fn(),
  tryConsume: vi.fn(),
  resolveTripGeo: vi.fn(),
  findDayByIdAndTripId: vi.fn(),
}));

vi.mock('../logger', async () => {
  const { mockLogger } = await import('../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});
vi.mock('../maps/config', () => ({
  getMapsConfig: () => ({ browserKey: 'browser-key' }),
  isMapsEnabled: mocks.isMapsEnabled,
}));
vi.mock('../maps/pacificTime', () => ({
  getNextPacificReset: () => new Date('2026-10-25T07:00:00.000Z'),
}));
vi.mock('../maps/tripGeoResolver', () => ({
  resolveTripGeo: mocks.resolveTripGeo,
}));
vi.mock('../maps/usageTracker', () => ({
  getUsage: mocks.getUsage,
  markExhausted: mocks.markExhausted,
  tryConsume: mocks.tryConsume,
}));
vi.mock('../repositories/trip', () => ({
  findDayByIdAndTripId: mocks.findDayByIdAndTripId,
}));

import {
  createMockReqRes,
  expectJsonStatus,
  itReturns500,
} from '../test-utils/httpMocks';

import {
  getMapsConfigForBrowser,
  getMapsStatus,
  reportMapsError,
  resolveGeo,
} from './mapsController';

const RESET_AT = '2026-10-25T07:00:00.000Z';

describe('mapsController', () => {
  beforeEach(() => {
    mocks.isMapsEnabled.mockReset().mockReturnValue(true);
    mocks.getUsage
      .mockReset()
      .mockResolvedValue({ used: 0, limit: 200, exhausted: false });
    mocks.markExhausted.mockReset().mockResolvedValue(undefined);
    mocks.tryConsume.mockReset().mockResolvedValue(true);
    mocks.resolveTripGeo.mockReset();
    mocks.findDayByIdAndTripId.mockReset().mockResolvedValue({ id: 2 });
  });

  describe('getMapsStatus', () => {
    it('reports the feature as disabled without touching the database', async () => {
      mocks.isMapsEnabled.mockReturnValue(false);
      const { req, res } = createMockReqRes();

      await getMapsStatus(req, res);

      expect(res.json).toHaveBeenCalledWith({
        enabled: false,
        exhausted: false,
        geocodeExhausted: false,
        resetAt: null,
      });
      expect(mocks.getUsage).not.toHaveBeenCalled();
    });

    it.each([
      { load: false, geocode: false },
      { load: true, geocode: false },
      { load: false, geocode: true },
    ])(
      'reports load exhausted=$load and geocode exhausted=$geocode',
      async ({ load, geocode }) => {
        mocks.getUsage.mockImplementation(async (kind: string) => ({
          used: 0,
          limit: 1,
          exhausted: kind === 'load' ? load : geocode,
        }));
        const { req, res } = createMockReqRes();

        await getMapsStatus(req, res);

        expect(res.json).toHaveBeenCalledWith({
          enabled: true,
          exhausted: load,
          geocodeExhausted: geocode,
          resetAt: RESET_AT,
        });
      },
    );

    itReturns500([
      {
        name: 'getMapsStatus',
        handler: getMapsStatus,
        arrange: error => mocks.getUsage.mockRejectedValue(error),
        expectedError: 'Failed to read maps status',
      },
    ]);
  });

  describe('getMapsConfigForBrowser', () => {
    it('returns 404 when the feature is not configured', async () => {
      mocks.isMapsEnabled.mockReturnValue(false);
      const { req, res } = createMockReqRes();

      await getMapsConfigForBrowser(req, res);

      expectJsonStatus(res, 404, { error: 'Maps feature is not configured' });
      expect(mocks.tryConsume).not.toHaveBeenCalled();
    });

    it('returns 429 with the reset time when the load quota is spent', async () => {
      mocks.tryConsume.mockResolvedValue(false);
      const { req, res } = createMockReqRes();

      await getMapsConfigForBrowser(req, res);

      expectJsonStatus(res, 429, {
        error: 'Daily map quota reached',
        resetAt: RESET_AT,
      });
    });

    it('counts one load and returns the browser key', async () => {
      const { req, res } = createMockReqRes();

      await getMapsConfigForBrowser(req, res);

      expect(mocks.tryConsume).toHaveBeenCalledWith('load');
      expect(res.json).toHaveBeenCalledWith({ apiKey: 'browser-key' });
    });

    itReturns500([
      {
        name: 'getMapsConfigForBrowser',
        handler: getMapsConfigForBrowser,
        arrange: error => mocks.tryConsume.mockRejectedValue(error),
        expectedError: 'Failed to load maps config',
      },
    ]);
  });

  describe('resolveGeo', () => {
    it.each([
      { description: 'an empty body', body: {} },
      { description: 'string ids', body: { tripId: '1', dayId: '2' } },
      { description: 'a zero tripId', body: { tripId: 0, dayId: 2 } },
      { description: 'a negative dayId', body: { tripId: 1, dayId: -2 } },
      { description: 'a fractional id', body: { tripId: 1.5, dayId: 2 } },
      { description: 'a missing dayId', body: { tripId: 1 } },
    ])('returns 400 for $description', async ({ body }) => {
      const { req, res } = createMockReqRes({ body });

      await resolveGeo(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mocks.resolveTripGeo).not.toHaveBeenCalled();
    });

    it('returns 404 when the feature is not configured', async () => {
      mocks.isMapsEnabled.mockReturnValue(false);
      const { req, res } = createMockReqRes({ body: { tripId: 1, dayId: 2 } });

      await resolveGeo(req, res);

      expectJsonStatus(res, 404, { error: 'Maps feature is not configured' });
    });

    it('returns 404 when the day does not belong to the trip', async () => {
      mocks.findDayByIdAndTripId.mockResolvedValue(null);
      const { req, res } = createMockReqRes({ body: { tripId: 1, dayId: 2 } });

      await resolveGeo(req, res);

      expectJsonStatus(res, 404, { error: 'Day not found' });
      expect(mocks.findDayByIdAndTripId).toHaveBeenCalledWith(1, 2);
      expect(mocks.resolveTripGeo).not.toHaveBeenCalled();
    });

    it('returns the resolved locations for the trip', async () => {
      const result = { attractions: [], geocodeExhausted: false };
      mocks.resolveTripGeo.mockResolvedValue(result);
      const { req, res } = createMockReqRes({ body: { tripId: 1, dayId: 2 } });

      await resolveGeo(req, res);

      expect(mocks.resolveTripGeo).toHaveBeenCalledWith(1, 2);
      expect(res.json).toHaveBeenCalledWith(result);
    });

    itReturns500([
      {
        name: 'resolveGeo',
        handler: resolveGeo,
        req: { body: { tripId: 1, dayId: 2 } },
        arrange: error => mocks.resolveTripGeo.mockRejectedValue(error),
        expectedError: 'Failed to resolve attraction locations',
      },
    ]);
  });

  describe('reportMapsError', () => {
    it.each([
      { description: 'a missing reason', body: {} },
      { description: 'an unknown reason', body: { reason: 'other' } },
      { description: 'a non-string reason', body: { reason: 1 } },
    ])('returns 400 for $description', async ({ body }) => {
      const { req, res } = createMockReqRes({ body });

      await reportMapsError(req, res);

      expectJsonStatus(res, 400, { error: 'Unknown reason' });
      expect(mocks.markExhausted).not.toHaveBeenCalled();
    });

    it("marks today's map loads exhausted for an auth failure", async () => {
      const { req, res } = createMockReqRes({
        body: { reason: 'auth_failure' },
      });

      await reportMapsError(req, res);

      expect(mocks.markExhausted).toHaveBeenCalledWith('load');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    itReturns500([
      {
        name: 'reportMapsError',
        handler: reportMapsError,
        req: { body: { reason: 'auth_failure' } },
        arrange: error => mocks.markExhausted.mockRejectedValue(error),
        expectedError: 'Failed to record maps error',
      },
    ]);
  });
});
