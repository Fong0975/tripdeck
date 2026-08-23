import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as tripRepo from '../../repositories/checklist/trip';
import { createMockReqRes, expectJsonStatus } from '../../test-utils/httpMocks';

import {
  addOccasion,
  addTripCategory,
  deleteOccasion,
  deleteTripCategory,
  getTripChecklist,
  updateOccasion,
  updateTripCategory,
} from './tripStructureController';

vi.mock('../../repositories/checklist/trip');

const invalidNameCases = [
  { label: 'name is missing', body: {} },
  { label: 'name is an empty string', body: { name: '' } },
  { label: 'name is not a string', body: { name: 42 } },
];

beforeEach(() => {
  vi.clearAllMocks();
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

    expect(tripRepo.createOccasion).toHaveBeenCalledWith(1, 'Return trip');
    expectJsonStatus(res, 201, occasion);
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
  it('returns 404 when the occasion does not belong to the trip', async () => {
    vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2' },
    });

    await deleteOccasion(req, res);

    expectJsonStatus(res, 404, { error: 'Occasion not found' });
    expect(tripRepo.getOccasionCount).not.toHaveBeenCalled();
  });

  it.each([
    {
      count: 1,
      expectStatus: 409,
      expectError: 'Cannot delete the last occasion',
    },
    {
      count: 0,
      expectStatus: 409,
      expectError: 'Cannot delete the last occasion',
    },
  ])(
    'returns 409 when the occasion count is $count',
    async ({ count, expectStatus, expectError }) => {
      vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(true);
      vi.mocked(tripRepo.getOccasionCount).mockResolvedValue(count);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', occId: '2' },
      });

      await deleteOccasion(req, res);

      expectJsonStatus(res, expectStatus, { error: expectError });
      expect(tripRepo.deleteOccasion).not.toHaveBeenCalled();
    },
  );

  it('proceeds to delete when the occasion count is greater than 1', async () => {
    vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.getOccasionCount).mockResolvedValue(2);
    vi.mocked(tripRepo.deleteOccasion).mockResolvedValue(true);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2' },
    });

    await deleteOccasion(req, res);

    expect(tripRepo.deleteOccasion).toHaveBeenCalledWith(2);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('returns 404 when the count allows deletion but the delete resolves false', async () => {
    vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.getOccasionCount).mockResolvedValue(2);
    vi.mocked(tripRepo.deleteOccasion).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2' },
    });

    await deleteOccasion(req, res);

    expectJsonStatus(res, 404, { error: 'Occasion not found' });
  });
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

    expect(tripRepo.createTripCategory).toHaveBeenCalledWith(1, 'Gear');
    expectJsonStatus(res, 201, category);
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
  interface FailureCase {
    name: string;
    handler: (req: Request, res: Response) => Promise<void>;
    params?: Record<string, string>;
    body?: unknown;
    configureRejection: (error: Error) => void;
    expectedError: string;
  }

  const failureCases: FailureCase[] = [
    {
      name: 'getTripChecklist',
      handler: getTripChecklist,
      params: { tripId: '1' },
      configureRejection: error =>
        vi.mocked(tripRepo.findOrInitChecklist).mockRejectedValue(error),
      expectedError: 'Failed to fetch checklist',
    },
    {
      name: 'addOccasion',
      handler: addOccasion,
      params: { tripId: '1' },
      body: { name: 'Departure' },
      configureRejection: error =>
        vi.mocked(tripRepo.createOccasion).mockRejectedValue(error),
      expectedError: 'Failed to add occasion',
    },
    {
      name: 'updateOccasion',
      handler: updateOccasion,
      params: { tripId: '1', occId: '2' },
      body: { name: 'Departure' },
      configureRejection: error =>
        vi
          .mocked(tripRepo.verifyOccasionBelongsToTrip)
          .mockRejectedValue(error),
      expectedError: 'Failed to update occasion',
    },
    {
      name: 'deleteOccasion',
      handler: deleteOccasion,
      params: { tripId: '1', occId: '2' },
      configureRejection: error =>
        vi
          .mocked(tripRepo.verifyOccasionBelongsToTrip)
          .mockRejectedValue(error),
      expectedError: 'Failed to delete occasion',
    },
    {
      name: 'addTripCategory',
      handler: addTripCategory,
      params: { tripId: '1' },
      body: { name: 'Gear' },
      configureRejection: error =>
        vi.mocked(tripRepo.createTripCategory).mockRejectedValue(error),
      expectedError: 'Failed to add category',
    },
    {
      name: 'updateTripCategory',
      handler: updateTripCategory,
      params: { tripId: '1', catId: '2' },
      body: { name: 'Gear' },
      configureRejection: error =>
        vi
          .mocked(tripRepo.verifyCategoryBelongsToTrip)
          .mockRejectedValue(error),
      expectedError: 'Failed to update category',
    },
    {
      name: 'deleteTripCategory',
      handler: deleteTripCategory,
      params: { tripId: '1', catId: '2' },
      configureRejection: error =>
        vi
          .mocked(tripRepo.verifyCategoryBelongsToTrip)
          .mockRejectedValue(error),
      expectedError: 'Failed to delete category',
    },
  ];

  it.each(failureCases)(
    '$name returns 500 with its error message when the repository rejects',
    async ({ handler, params, body, configureRejection, expectedError }) => {
      configureRejection(new Error('database connection lost'));
      const { req, res } = createMockReqRes({ params, body });

      await handler(req, res);

      expectJsonStatus(res, 500, { error: expectedError });
    },
  );
});
