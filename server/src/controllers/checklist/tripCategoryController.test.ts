import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as tripRepo from '../../repositories/checklist/trip';
import { invalidNameCases } from '../../test-utils/fixtures';
import {
  createMockReqRes,
  expectJsonStatus,
  type MockReqOverrides,
} from '../../test-utils/httpMocks';

import {
  addTripCategory,
  deleteTripCategory,
  updateTripCategory,
} from './tripCategoryController';

vi.mock('../../repositories/checklist/trip', () => ({
  createTripCategory: vi.fn(),
  deleteTripCategory: vi.fn(),
  tripExists: vi.fn(),
  updateTripCategory: vi.fn(),
  verifyCategoryBelongsToTrip: vi.fn(),
}));

const blankNameCases = [
  ...invalidNameCases,
  { label: 'name is whitespace only', body: { name: '   ' } },
];

beforeEach(() => {
  vi.mocked(tripRepo.tripExists).mockResolvedValue(true);
});

describe('addTripCategory', () => {
  it.each(blankNameCases)('returns 400 when $label', async ({ body }) => {
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
  it.each(blankNameCases)('returns 400 when $label', async ({ body }) => {
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

describe('unexpected repository errors', () => {
  const tests: Array<{
    name: string;
    handler: typeof addTripCategory;
    req: MockReqOverrides;
    arrange: (error: Error) => void;
  }> = [
    {
      name: 'addTripCategory',
      handler: addTripCategory,
      req: { params: { tripId: '1' }, body: { name: 'Gear' } },
      arrange: error =>
        vi.mocked(tripRepo.createTripCategory).mockRejectedValue(error),
    },
    {
      name: 'updateTripCategory',
      handler: updateTripCategory,
      req: { params: { tripId: '1', catId: '2' }, body: { name: 'Gear' } },
      arrange: error =>
        vi
          .mocked(tripRepo.verifyCategoryBelongsToTrip)
          .mockRejectedValue(error),
    },
    {
      name: 'deleteTripCategory',
      handler: deleteTripCategory,
      req: { params: { tripId: '1', catId: '2' } },
      arrange: error =>
        vi
          .mocked(tripRepo.verifyCategoryBelongsToTrip)
          .mockRejectedValue(error),
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
