import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as tripRepo from '../../repositories/checklist/trip';
import { createMockReqRes, expectJsonStatus } from '../../test-utils/httpMocks';

import {
  addTripItem,
  deleteTripItem,
  setCheck,
  updateTripItem,
} from './tripItemController';

vi.mock('../../repositories/checklist/trip');

const invalidNameCases = [
  { label: 'name is missing', body: {} },
  { label: 'name is an empty string', body: { name: '' } },
  { label: 'name is not a string', body: { name: 42 } },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('addTripItem', () => {
  it('returns 404 when the category does not belong to the trip, checked before name validation', async () => {
    vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
      body: {},
    });

    await addTripItem(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
    expect(tripRepo.createTripItem).not.toHaveBeenCalled();
  });

  it.each(invalidNameCases)(
    'returns 400 when $label once the category belongs to the trip',
    async ({ body }) => {
      vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(true);
      const { req, res } = createMockReqRes({
        params: { tripId: '1', catId: '2' },
        body,
      });

      await addTripItem(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(tripRepo.createTripItem).not.toHaveBeenCalled();
    },
  );

  it('returns 201 with the created item', async () => {
    const item = {
      id: 63,
      name: 'Neck pillow',
      quantity: 1,
      notes: null,
      storage_location: null,
      specs: [],
    };
    vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.createTripItem).mockResolvedValue(item);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
      body: { name: 'Neck pillow' },
    });

    await addTripItem(req, res);

    expect(tripRepo.createTripItem).toHaveBeenCalledWith(2, {
      name: 'Neck pillow',
      quantity: undefined,
      notes: undefined,
      storage_location: undefined,
    });
    expectJsonStatus(res, 201, item);
  });
});

describe('deleteTripItem', () => {
  it('returns 404 when the item does not belong to the trip', async () => {
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
    });

    await deleteTripItem(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(tripRepo.deleteTripItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the delete resolves false', async () => {
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.deleteTripItem).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
    });

    await deleteTripItem(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
  });

  it('returns 204 on success', async () => {
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.deleteTripItem).mockResolvedValue(true);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
    });

    await deleteTripItem(req, res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe('updateTripItem', () => {
  it('returns 404 when the item does not belong to the trip', async () => {
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body: { name: 'Charger' },
    });

    await updateTripItem(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(tripRepo.updateTripItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the update resolves null', async () => {
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.updateTripItem).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body: { name: 'Charger' },
    });

    await updateTripItem(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
  });

  it('does not perform a name-required 400 check and updates with an empty body', async () => {
    const item = {
      id: 2,
      name: 'Charger',
      quantity: 2,
      notes: null,
      storage_location: null,
      specs: [],
    };
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.updateTripItem).mockResolvedValue(item);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body: {},
    });

    await updateTripItem(req, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(tripRepo.updateTripItem).toHaveBeenCalledWith(2, {});
    expect(res.json).toHaveBeenCalledWith(item);
  });

  it('returns 200 with the updated item', async () => {
    const item = {
      id: 2,
      name: 'Charger',
      quantity: 2,
      notes: null,
      storage_location: null,
      specs: [],
    };
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.updateTripItem).mockResolvedValue(item);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body: { name: 'Charger', quantity: 2 },
    });

    await updateTripItem(req, res);

    expect(res.json).toHaveBeenCalledWith(item);
  });
});

describe('setCheck', () => {
  it.each([
    { label: 'checked is missing', body: {} },
    { label: 'checked is a string', body: { checked: 'true' } },
    { label: 'checked is a number', body: { checked: 1 } },
  ])('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2', itemId: '3' },
      body,
    });

    await setCheck(req, res);

    expectJsonStatus(res, 400, { error: 'checked must be a boolean' });
    expect(tripRepo.verifyOccasionBelongsToTrip).not.toHaveBeenCalled();
  });

  it('returns 404 when the occasion does not belong to the trip', async () => {
    vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2', itemId: '3' },
      body: { checked: true },
    });

    await setCheck(req, res);

    expectJsonStatus(res, 404, { error: 'Occasion not found' });
    expect(tripRepo.verifyItemBelongsToTrip).not.toHaveBeenCalled();
  });

  it('returns 404 when the item does not belong to the trip', async () => {
    vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2', itemId: '3' },
      body: { checked: true },
    });

    await setCheck(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(tripRepo.setCheck).not.toHaveBeenCalled();
  });

  it('returns 204 on success', async () => {
    vi.mocked(tripRepo.verifyOccasionBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2', itemId: '3' },
      body: { checked: true },
    });

    await setCheck(req, res);

    expect(tripRepo.setCheck).toHaveBeenCalledWith(2, 3, true);
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
      name: 'addTripItem',
      handler: addTripItem,
      params: { tripId: '1', catId: '2' },
      body: { name: 'Pillow' },
      configureRejection: error =>
        vi
          .mocked(tripRepo.verifyCategoryBelongsToTrip)
          .mockRejectedValue(error),
      expectedError: 'Failed to add item',
    },
    {
      name: 'deleteTripItem',
      handler: deleteTripItem,
      params: { tripId: '1', itemId: '2' },
      configureRejection: error =>
        vi.mocked(tripRepo.verifyItemBelongsToTrip).mockRejectedValue(error),
      expectedError: 'Failed to delete item',
    },
    {
      name: 'updateTripItem',
      handler: updateTripItem,
      params: { tripId: '1', itemId: '2' },
      body: {},
      configureRejection: error =>
        vi.mocked(tripRepo.verifyItemBelongsToTrip).mockRejectedValue(error),
      expectedError: 'Failed to update item',
    },
    {
      name: 'setCheck',
      handler: setCheck,
      params: { tripId: '1', occId: '2', itemId: '3' },
      body: { checked: true },
      configureRejection: error =>
        vi
          .mocked(tripRepo.verifyOccasionBelongsToTrip)
          .mockRejectedValue(error),
      expectedError: 'Failed to set check',
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
