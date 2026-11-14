import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as tripRepo from '../../repositories/checklist/trip';
import { invalidNameCases } from '../../test-utils/fixtures';
import {
  createMockReqRes,
  expectJsonStatus,
  itReturns500,
  type Returns500Case,
} from '../../test-utils/httpMocks';

import {
  addOccasion,
  addTripCategory,
  deleteOccasion,
  deleteTripCategory,
  getTripChecklist,
  updateOccasion,
  updateTripCategory,
} from './tripStructureController';

vi.mock('../../repositories/checklist/trip', () => ({
  createOccasion: vi.fn(),
  createTripCategory: vi.fn(),
  deleteOccasionIfNotLast: vi.fn(),
  deleteTripCategory: vi.fn(),
  findOrInitChecklist: vi.fn(),
  tripExists: vi.fn(),
  updateOccasion: vi.fn(),
  updateTripCategory: vi.fn(),
  verifyCategoryBelongsToTrip: vi.fn(),
  verifyOccasionBelongsToTrip: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(tripRepo.tripExists).mockResolvedValue(true);
});

describe('invalid id params', () => {
  const handlerCases: Array<{
    name: string;
    handler: typeof getTripChecklist;
    params: Record<string, string>;
  }> = [
    { name: 'getTripChecklist', handler: getTripChecklist, params: {} },
    { name: 'addOccasion', handler: addOccasion, params: {} },
    { name: 'updateOccasion', handler: updateOccasion, params: { occId: '2' } },
    { name: 'deleteOccasion', handler: deleteOccasion, params: { occId: '2' } },
    { name: 'addTripCategory', handler: addTripCategory, params: {} },
    {
      name: 'updateTripCategory',
      handler: updateTripCategory,
      params: { catId: '2' },
    },
    {
      name: 'deleteTripCategory',
      handler: deleteTripCategory,
      params: { catId: '2' },
    },
  ];
  const tests = handlerCases.flatMap(({ name, handler, params }) => [
    ...['abc', '0', '-1', '1.5'].map(tripId => ({
      label: `${name} with tripId=${tripId}`,
      handler,
      params: { ...params, tripId },
      expectedError: 'Invalid tripId',
    })),
    ...Object.keys(params).map(key => ({
      label: `${name} with ${key}=abc`,
      handler,
      params: { ...params, tripId: '1', [key]: 'abc' },
      expectedError: `Invalid ${key}`,
    })),
  ]);

  it.each(tests)(
    'returns 400 for $label',
    async ({ handler, params, expectedError }) => {
      const { req, res } = createMockReqRes({
        params,
        body: { name: 'Valid name' },
      });

      await handler(req, res);

      expectJsonStatus(res, 400, { error: expectedError });
      expect(tripRepo.findOrInitChecklist).not.toHaveBeenCalled();
      expect(tripRepo.tripExists).not.toHaveBeenCalled();
      expect(tripRepo.verifyOccasionBelongsToTrip).not.toHaveBeenCalled();
      expect(tripRepo.deleteOccasionIfNotLast).not.toHaveBeenCalled();
      expect(tripRepo.verifyCategoryBelongsToTrip).not.toHaveBeenCalled();
    },
  );
});

describe('getTripChecklist', () => {
  it('returns 200 with the trip checklist', async () => {
    const checklist = { tripId: 5, categories: [], occasions: [] };
    vi.mocked(tripRepo.findOrInitChecklist).mockResolvedValue(checklist);
    const { req, res } = createMockReqRes({ params: { tripId: '5' } });

    await getTripChecklist(req, res);

    expect(tripRepo.findOrInitChecklist).toHaveBeenCalledWith(5);
    expect(res.json).toHaveBeenCalledWith(checklist);
  });

  it('returns 404 when the trip does not exist', async () => {
    vi.mocked(tripRepo.findOrInitChecklist).mockResolvedValue(null);
    const { req, res } = createMockReqRes({ params: { tripId: '5' } });

    await getTripChecklist(req, res);

    expectJsonStatus(res, 404, { error: 'Trip not found' });
  });
});

describe('addOccasion', () => {
  it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({ params: { tripId: '1' }, body });

    await addOccasion(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(tripRepo.createOccasion).not.toHaveBeenCalled();
  });

  it('returns 201 with the created occasion', async () => {
    const occasion = { id: 2, name: 'Return trip', checks: {} };
    vi.mocked(tripRepo.createOccasion).mockResolvedValue(occasion);
    const { req, res } = createMockReqRes({
      params: { tripId: '1' },
      body: { name: 'Return trip' },
    });

    await addOccasion(req, res);

    expect(tripRepo.tripExists).toHaveBeenCalledWith(1);
    expect(tripRepo.createOccasion).toHaveBeenCalledWith(1, 'Return trip');
    expectJsonStatus(res, 201, occasion);
  });

  it('returns 404 when the trip does not exist', async () => {
    vi.mocked(tripRepo.tripExists).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1' },
      body: { name: 'Return trip' },
    });

    await addOccasion(req, res);

    expectJsonStatus(res, 404, { error: 'Trip not found' });
    expect(tripRepo.createOccasion).not.toHaveBeenCalled();
  });
});

describe('updateOccasion', () => {
  it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2' },
      body,
    });

    await updateOccasion(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(tripRepo.verifyOccasionBelongsToTrip).not.toHaveBeenCalled();
  });

  it('returns 404 when the occasion does not belong to the trip', async () => {
    vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2' },
      body: { name: 'Departure' },
    });

    await updateOccasion(req, res);

    expectJsonStatus(res, 404, { error: 'Occasion not found' });
    expect(tripRepo.updateOccasion).not.toHaveBeenCalled();
  });

  it('returns 404 when the update resolves null', async () => {
    vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.updateOccasion).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2' },
      body: { name: 'Departure' },
    });

    await updateOccasion(req, res);

    expectJsonStatus(res, 404, { error: 'Occasion not found' });
  });

  it('returns 200 with the updated occasion', async () => {
    const occasion = { id: 2, name: 'Departure', checks: {} };
    vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.updateOccasion).mockResolvedValue(occasion);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2' },
      body: { name: 'Departure' },
    });

    await updateOccasion(req, res);

    expect(res.json).toHaveBeenCalledWith(occasion);
  });
});

describe('deleteOccasion', () => {
  it.each([
    {
      result: 'deleted' as const,
      expectStatus: 204,
      expectBody: undefined,
    },
    {
      result: 'not_found' as const,
      expectStatus: 404,
      expectBody: { error: 'Occasion not found' },
    },
    {
      result: 'last_occasion' as const,
      expectStatus: 409,
      expectBody: { error: 'Cannot delete the last occasion' },
    },
  ])(
    'responds $expectStatus when the repository returns $result',
    async ({ result, expectStatus, expectBody }) => {
      vi.mocked(tripRepo.deleteOccasionIfNotLast).mockResolvedValue(result);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', occId: '2' },
      });

      await deleteOccasion(req, res);

      expect(tripRepo.deleteOccasionIfNotLast).toHaveBeenCalledWith(1, 2);
      expect(res.status).toHaveBeenCalledWith(expectStatus);
      if (expectBody) {
        expect(res.json).toHaveBeenCalledWith(expectBody);
      } else {
        expect(res.send).toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
      }
    },
  );
});

describe('addTripCategory', () => {
  it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({ params: { tripId: '1' }, body });

    await addTripCategory(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(tripRepo.createTripCategory).not.toHaveBeenCalled();
  });

  it('returns 201 with the created category', async () => {
    const category = { id: 3, name: 'Gear', items: [] };
    vi.mocked(tripRepo.createTripCategory).mockResolvedValue(category);
    const { req, res } = createMockReqRes({
      params: { tripId: '1' },
      body: { name: 'Gear' },
    });

    await addTripCategory(req, res);

    expect(tripRepo.tripExists).toHaveBeenCalledWith(1);
    expect(tripRepo.createTripCategory).toHaveBeenCalledWith(1, 'Gear');
    expectJsonStatus(res, 201, category);
  });

  it('returns 404 when the trip does not exist', async () => {
    vi.mocked(tripRepo.tripExists).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1' },
      body: { name: 'Gear' },
    });

    await addTripCategory(req, res);

    expectJsonStatus(res, 404, { error: 'Trip not found' });
    expect(tripRepo.createTripCategory).not.toHaveBeenCalled();
  });
});

describe('updateTripCategory', () => {
  it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
      body,
    });

    await updateTripCategory(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(tripRepo.verifyCategoryBelongsToTrip).not.toHaveBeenCalled();
  });

  it('returns 404 when the category does not belong to the trip', async () => {
    vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
      body: { name: 'Gear' },
    });

    await updateTripCategory(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
    expect(tripRepo.updateTripCategory).not.toHaveBeenCalled();
  });

  it('returns 404 when the update resolves false', async () => {
    vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.updateTripCategory).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
      body: { name: 'Gear' },
    });

    await updateTripCategory(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
  });

  it('returns 204 with no body on success', async () => {
    vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.updateTripCategory).mockResolvedValue(true);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
      body: { name: 'Gear' },
    });

    await updateTripCategory(req, res);

    expect(tripRepo.updateTripCategory).toHaveBeenCalledWith(2, 'Gear');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('deleteTripCategory', () => {
  it('returns 404 when the category does not belong to the trip', async () => {
    vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
    });

    await deleteTripCategory(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
    expect(tripRepo.deleteTripCategory).not.toHaveBeenCalled();
  });

  it('returns 404 when the delete resolves false', async () => {
    vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.deleteTripCategory).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
    });

    await deleteTripCategory(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
  });

  it('returns 204 on success', async () => {
    vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.deleteTripCategory).mockResolvedValue(true);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
    });

    await deleteTripCategory(req, res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe('500 responses', () => {
  const failureCases: Returns500Case[] = [
    {
      name: 'getTripChecklist',
      handler: getTripChecklist,
      req: { params: { tripId: '1' } },
      arrange: error =>
        vi.mocked(tripRepo.findOrInitChecklist).mockRejectedValue(error),
      expectedError: 'Failed to fetch checklist',
    },
    {
      name: 'addOccasion',
      handler: addOccasion,
      req: { params: { tripId: '1' }, body: { name: 'Departure' } },
      arrange: error =>
        vi.mocked(tripRepo.createOccasion).mockRejectedValue(error),
      expectedError: 'Failed to add occasion',
    },
    {
      name: 'updateOccasion',
      handler: updateOccasion,
      req: { params: { tripId: '1', occId: '2' }, body: { name: 'Departure' } },
      arrange: error =>
        vi
          .mocked(tripRepo.verifyOccasionBelongsToTrip)
          .mockRejectedValue(error),
      expectedError: 'Failed to update occasion',
    },
    {
      name: 'deleteOccasion',
      handler: deleteOccasion,
      req: { params: { tripId: '1', occId: '2' } },
      arrange: error =>
        vi.mocked(tripRepo.deleteOccasionIfNotLast).mockRejectedValue(error),
      expectedError: 'Failed to delete occasion',
    },
    {
      name: 'addTripCategory',
      handler: addTripCategory,
      req: { params: { tripId: '1' }, body: { name: 'Gear' } },
      arrange: error =>
        vi.mocked(tripRepo.createTripCategory).mockRejectedValue(error),
      expectedError: 'Failed to add category',
    },
    {
      name: 'updateTripCategory',
      handler: updateTripCategory,
      req: { params: { tripId: '1', catId: '2' }, body: { name: 'Gear' } },
      arrange: error =>
        vi
          .mocked(tripRepo.verifyCategoryBelongsToTrip)
          .mockRejectedValue(error),
      expectedError: 'Failed to update category',
    },
    {
      name: 'deleteTripCategory',
      handler: deleteTripCategory,
      req: { params: { tripId: '1', catId: '2' } },
      arrange: error =>
        vi
          .mocked(tripRepo.verifyCategoryBelongsToTrip)
          .mockRejectedValue(error),
      expectedError: 'Failed to delete category',
    },
  ];

  itReturns500(failureCases);
});
