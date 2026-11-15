import { describe, expect, it, vi } from 'vitest';

import * as checklistRepo from '../../repositories/checklist/trip';
import { invalidNameCases } from '../../test-utils/fixtures';
import {
  createMockReqRes,
  expectJsonStatus,
  itRejects,
  type RejectCase,
} from '../../test-utils/httpMocks';

import {
  addTripItem,
  deleteTripItem,
  setCheck,
  updateTripItem,
} from './tripItemController';

vi.mock('../../repositories/checklist/trip', () => ({
  createTripItem: vi.fn(),
  deleteTripItem: vi.fn(),
  setCheck: vi.fn(),
  updateTripItem: vi.fn(),
  verifyCategoryBelongsToTrip: vi.fn(),
  verifyItemBelongsToTrip: vi.fn(),
  verifyOccasionBelongsToTrip: vi.fn(),
}));

const blankNameCases = [
  ...invalidNameCases,
  { label: 'name is whitespace only', body: { name: '   ' } },
];

describe('addTripItem', () => {
  it('returns 404 when the category does not belong to the trip, checked before name validation', async () => {
    vi.mocked(checklistRepo.verifyCategoryBelongsToTrip).mockResolvedValue(
      false,
    );
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
      body: {},
    });

    await addTripItem(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
    expect(checklistRepo.createTripItem).not.toHaveBeenCalled();
  });

  it.each(blankNameCases)(
    'returns 400 when $label once the category belongs to the trip',
    async ({ body }) => {
      vi.mocked(checklistRepo.verifyCategoryBelongsToTrip).mockResolvedValue(
        true,
      );
      const { req, res } = createMockReqRes({
        params: { tripId: '1', catId: '2' },
        body,
      });

      await addTripItem(req, res);

      expectJsonStatus(res, 400, { error: 'name is required' });
      expect(checklistRepo.createTripItem).not.toHaveBeenCalled();
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
    vi.mocked(checklistRepo.verifyCategoryBelongsToTrip).mockResolvedValue(
      true,
    );
    vi.mocked(checklistRepo.createTripItem).mockResolvedValue(item);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
      body: { name: 'Neck pillow' },
    });

    await addTripItem(req, res);

    expect(checklistRepo.verifyCategoryBelongsToTrip).toHaveBeenCalledWith(
      2,
      1,
    );
    expect(checklistRepo.createTripItem).toHaveBeenCalledWith(2, {
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
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
    });

    await deleteTripItem(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(checklistRepo.deleteTripItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the delete resolves false', async () => {
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(checklistRepo.deleteTripItem).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
    });

    await deleteTripItem(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
  });

  it('returns 204 on success', async () => {
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(checklistRepo.deleteTripItem).mockResolvedValue(true);
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
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body: { name: 'Charger' },
    });

    await updateTripItem(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(checklistRepo.updateTripItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the update resolves null', async () => {
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(checklistRepo.updateTripItem).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body: { name: 'Charger' },
    });

    await updateTripItem(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
  });

  it.each([
    {
      label: 'name is blank',
      body: { name: '  ' },
      error: 'name is required',
    },
    {
      label: 'name is too long',
      body: { name: 'x'.repeat(256) },
      error: 'name must be at most 255 characters',
    },
    {
      label: 'quantity is negative',
      body: { quantity: -1 },
      error: 'quantity must be a non-negative integer',
    },
    {
      label: 'storage_location is too long',
      body: { storage_location: 'x'.repeat(256) },
      error: 'storage_location must be at most 255 characters',
    },
  ])('returns 400 when $label', async ({ body, error }) => {
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body,
    });

    await updateTripItem(req, res);

    expectJsonStatus(res, 400, { error });
    expect(checklistRepo.verifyItemBelongsToTrip).not.toHaveBeenCalled();
    expect(checklistRepo.updateTripItem).not.toHaveBeenCalled();
  });

  it('passes only the present fields to the repository', async () => {
    const item = {
      id: 2,
      name: 'Charger',
      quantity: 3,
      notes: null,
      storage_location: null,
      specs: [],
    };
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(checklistRepo.updateTripItem).mockResolvedValue(item);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body: { quantity: 3, unknown: 'dropped' },
    });

    await updateTripItem(req, res);

    expect(checklistRepo.updateTripItem).toHaveBeenCalledWith(2, {
      quantity: 3,
    });
    expect(res.json).toHaveBeenCalledWith(item);
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
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(checklistRepo.updateTripItem).mockResolvedValue(item);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body: {},
    });

    await updateTripItem(req, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(checklistRepo.updateTripItem).toHaveBeenCalledWith(2, {});
    expect(res.json).toHaveBeenCalledWith(item);
  });
});

describe('setCheck', () => {
  it('returns 400 when checked is not a boolean', async () => {
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2', itemId: '3' },
      body: { checked: 'true' },
    });

    await setCheck(req, res);

    expectJsonStatus(res, 400, { error: 'checked must be a boolean' });
    expect(checklistRepo.verifyOccasionBelongsToTrip).not.toHaveBeenCalled();
  });

  it('returns 404 when the occasion does not belong to the trip', async () => {
    vi.mocked(checklistRepo.verifyOccasionBelongsToTrip).mockResolvedValue(
      false,
    );
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2', itemId: '3' },
      body: { checked: true },
    });

    await setCheck(req, res);

    expectJsonStatus(res, 404, { error: 'Occasion not found' });
    expect(checklistRepo.verifyItemBelongsToTrip).not.toHaveBeenCalled();
  });

  it('returns 404 when the item does not belong to the trip', async () => {
    vi.mocked(checklistRepo.verifyOccasionBelongsToTrip).mockResolvedValue(
      true,
    );
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2', itemId: '3' },
      body: { checked: true },
    });

    await setCheck(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(checklistRepo.setCheck).not.toHaveBeenCalled();
  });

  it('returns 204 on success', async () => {
    vi.mocked(checklistRepo.verifyOccasionBelongsToTrip).mockResolvedValue(
      true,
    );
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2', itemId: '3' },
      body: { checked: true },
    });

    await setCheck(req, res);

    expect(checklistRepo.setCheck).toHaveBeenCalledWith(2, 3, true);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe('unexpected repository errors', () => {
  const tests: RejectCase[] = [
    {
      name: 'addTripItem',
      handler: addTripItem,
      req: { params: { tripId: '1', catId: '2' }, body: { name: 'Pillow' } },
      arrange: error =>
        vi
          .mocked(checklistRepo.verifyCategoryBelongsToTrip)
          .mockRejectedValue(error),
    },
    {
      name: 'deleteTripItem',
      handler: deleteTripItem,
      req: { params: { tripId: '1', itemId: '2' } },
      arrange: error =>
        vi
          .mocked(checklistRepo.verifyItemBelongsToTrip)
          .mockRejectedValue(error),
    },
    {
      name: 'updateTripItem',
      handler: updateTripItem,
      req: { params: { tripId: '1', itemId: '2' }, body: {} },
      arrange: error =>
        vi
          .mocked(checklistRepo.verifyItemBelongsToTrip)
          .mockRejectedValue(error),
    },
    {
      name: 'setCheck',
      handler: setCheck,
      req: {
        params: { tripId: '1', occId: '2', itemId: '3' },
        body: { checked: true },
      },
      arrange: error =>
        vi
          .mocked(checklistRepo.verifyOccasionBelongsToTrip)
          .mockRejectedValue(error),
    },
  ];

  itRejects(tests);
});
