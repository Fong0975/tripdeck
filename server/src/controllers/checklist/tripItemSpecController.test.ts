import { describe, expect, it, vi } from 'vitest';

import * as tripRepo from '../../repositories/checklist/trip';
import { invalidNameCases } from '../../test-utils/fixtures';
import {
  createMockReqRes,
  expectJsonStatus,
  type MockReqOverrides,
} from '../../test-utils/httpMocks';

import {
  addTripItemSpec,
  deleteTripItemSpec,
  updateTripItemSpec,
} from './tripItemSpecController';

vi.mock('../../repositories/checklist/trip', () => ({
  createTripItemSpec: vi.fn(),
  deleteTripItemSpec: vi.fn(),
  updateTripItemSpec: vi.fn(),
  verifyItemBelongsToTrip: vi.fn(),
  verifyTripSpecBelongsToItem: vi.fn(),
}));

const blankNameCases = [
  ...invalidNameCases,
  { label: 'name is whitespace only', body: { name: '   ' } },
];

describe('addTripItemSpec', () => {
  it.each(blankNameCases)('returns 400 when $label', async ({ body }) => {
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
  it.each(blankNameCases)('returns 400 when $label', async ({ body }) => {
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

    expect(tripRepo.verifyItemBelongsToTrip).toHaveBeenCalledWith(2, 1);
    expect(tripRepo.verifyTripSpecBelongsToItem).toHaveBeenCalledWith(3, 2);
    expect(tripRepo.updateTripItemSpec).toHaveBeenCalledWith(3, {
      name: 'Type-C charger',
      storage_location: undefined,
    });
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

describe('unexpected repository errors', () => {
  const tests: Array<{
    name: string;
    handler: typeof addTripItemSpec;
    req: MockReqOverrides;
    arrange: (error: Error) => void;
  }> = [
    {
      name: 'addTripItemSpec',
      handler: addTripItemSpec,
      req: {
        params: { tripId: '1', itemId: '2' },
        body: { name: 'Type-C charger' },
      },
      arrange: error =>
        vi.mocked(tripRepo.verifyItemBelongsToTrip).mockRejectedValue(error),
    },
    {
      name: 'updateTripItemSpec',
      handler: updateTripItemSpec,
      req: {
        params: { tripId: '1', itemId: '2', specId: '3' },
        body: { name: 'Type-C charger' },
      },
      arrange: error =>
        vi.mocked(tripRepo.verifyItemBelongsToTrip).mockRejectedValue(error),
    },
    {
      name: 'deleteTripItemSpec',
      handler: deleteTripItemSpec,
      req: { params: { tripId: '1', itemId: '2', specId: '3' } },
      arrange: error =>
        vi.mocked(tripRepo.verifyItemBelongsToTrip).mockRejectedValue(error),
    },
  ];

  it.each(tests)(
    '$name rejects with the repository error and sends nothing',
    async ({ handler, req, arrange }) => {
      const error = new Error('unexpected failure');
      arrange(error);
      const { req: mockReq, res } = createMockReqRes(req);

      await expect(handler(mockReq, res)).rejects.toBe(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    },
  );
});
