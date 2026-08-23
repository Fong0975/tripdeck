import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as tripRepo from '../../repositories/checklist/trip';
import { createMockReqRes, expectJsonStatus } from '../../test-utils/httpMocks';

import {
  addTripItemSpec,
  deleteTripItemSpec,
  updateTripItemSpec,
} from './tripItemSpecController';

vi.mock('../../repositories/checklist/trip');

const invalidNameCases = [
  { label: 'name is missing', body: {} },
  { label: 'name is an empty string', body: { name: '' } },
  { label: 'name is not a string', body: { name: 42 } },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('addTripItemSpec', () => {
  it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body,
    });

    await addTripItemSpec(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(tripRepo.verifyItemBelongsToTrip).not.toHaveBeenCalled();
  });

  it('returns 404 when the item does not belong to the trip', async () => {
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body: { name: 'Type-C charger' },
    });

    await addTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(tripRepo.createTripItemSpec).not.toHaveBeenCalled();
  });

  it('returns 404 when the created spec resolves null', async () => {
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.createTripItemSpec).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body: { name: 'Type-C charger' },
    });

    await addTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
  });

  it('returns 201 with the created spec', async () => {
    const spec = { id: 1, name: 'Type-C charger', storage_location: null };
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.createTripItemSpec).mockResolvedValue(spec);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body: { name: 'Type-C charger' },
    });

    await addTripItemSpec(req, res);

    expect(tripRepo.createTripItemSpec).toHaveBeenCalledWith(2, {
      name: 'Type-C charger',
      storage_location: undefined,
    });
    expectJsonStatus(res, 201, spec);
  });
});

describe('updateTripItemSpec', () => {
  it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
      body,
    });

    await updateTripItemSpec(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(tripRepo.verifyItemBelongsToTrip).not.toHaveBeenCalled();
  });

  it('returns 404 when the item does not belong to the trip', async () => {
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
      body: { name: 'Type-C charger' },
    });

    await updateTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(tripRepo.verifyTripSpecBelongsToItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the spec does not belong to the item', async () => {
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.verifyTripSpecBelongsToItem).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
      body: { name: 'Type-C charger' },
    });

    await updateTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Spec not found' });
    expect(tripRepo.updateTripItemSpec).not.toHaveBeenCalled();
  });

  it('returns 404 when the update resolves null', async () => {
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.verifyTripSpecBelongsToItem).mockResolvedValue(true);
    vi.mocked(tripRepo.updateTripItemSpec).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
      body: { name: 'Type-C charger' },
    });

    await updateTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Spec not found' });
  });

  it('returns 200 with the updated spec', async () => {
    const spec = { id: 3, name: 'Type-C charger', storage_location: null };
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.verifyTripSpecBelongsToItem).mockResolvedValue(true);
    vi.mocked(tripRepo.updateTripItemSpec).mockResolvedValue(spec);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
      body: { name: 'Type-C charger' },
    });

    await updateTripItemSpec(req, res);

    expect(res.json).toHaveBeenCalledWith(spec);
  });
});

describe('deleteTripItemSpec', () => {
  it('returns 404 when the item does not belong to the trip', async () => {
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
    });

    await deleteTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(tripRepo.verifyTripSpecBelongsToItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the spec does not belong to the item', async () => {
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.verifyTripSpecBelongsToItem).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
    });

    await deleteTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Spec not found' });
    expect(tripRepo.deleteTripItemSpec).not.toHaveBeenCalled();
  });

  it('returns 404 when the delete resolves false', async () => {
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.verifyTripSpecBelongsToItem).mockResolvedValue(true);
    vi.mocked(tripRepo.deleteTripItemSpec).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
    });

    await deleteTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Spec not found' });
  });

  it('returns 204 on success', async () => {
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.verifyTripSpecBelongsToItem).mockResolvedValue(true);
    vi.mocked(tripRepo.deleteTripItemSpec).mockResolvedValue(true);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
    });

    await deleteTripItemSpec(req, res);

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
      name: 'addTripItemSpec',
      handler: addTripItemSpec,
      params: { tripId: '1', itemId: '2' },
      body: { name: 'Type-C charger' },
      configureRejection: error =>
        vi.mocked(tripRepo.verifyItemBelongsToTrip).mockRejectedValue(error),
      expectedError: 'Failed to add spec',
    },
    {
      name: 'updateTripItemSpec',
      handler: updateTripItemSpec,
      params: { tripId: '1', itemId: '2', specId: '3' },
      body: { name: 'Type-C charger' },
      configureRejection: error =>
        vi.mocked(tripRepo.verifyItemBelongsToTrip).mockRejectedValue(error),
      expectedError: 'Failed to update spec',
    },
    {
      name: 'deleteTripItemSpec',
      handler: deleteTripItemSpec,
      params: { tripId: '1', itemId: '2', specId: '3' },
      configureRejection: error =>
        vi.mocked(tripRepo.verifyItemBelongsToTrip).mockRejectedValue(error),
      expectedError: 'Failed to delete spec',
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
