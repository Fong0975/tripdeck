import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as checklistRepo from '../../repositories/checklist/trip';
import { invalidNameCases } from '../../test-utils/fixtures';
import {
  createMockReqRes,
  expectJsonStatus,
  itRejects,
  type RejectCase,
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
  vi.mocked(checklistRepo.tripExists).mockResolvedValue(true);
});

describe('addTripCategory', () => {
  it.each(blankNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({ params: { tripId: '1' }, body });

    await addTripCategory(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(checklistRepo.createTripCategory).not.toHaveBeenCalled();
  });

  it('returns 201 with the created category', async () => {
    const category = { id: 3, name: 'Gear', items: [] };
    vi.mocked(checklistRepo.createTripCategory).mockResolvedValue(category);
    const { req, res } = createMockReqRes({
      params: { tripId: '1' },
      body: { name: 'Gear' },
    });

    await addTripCategory(req, res);

    expect(checklistRepo.tripExists).toHaveBeenCalledWith(1);
    expect(checklistRepo.createTripCategory).toHaveBeenCalledWith(1, 'Gear');
    expectJsonStatus(res, 201, category);
  });

  it('returns 404 when the trip does not exist', async () => {
    vi.mocked(checklistRepo.tripExists).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1' },
      body: { name: 'Gear' },
    });

    await addTripCategory(req, res);

    expectJsonStatus(res, 404, { error: 'Trip not found' });
    expect(checklistRepo.createTripCategory).not.toHaveBeenCalled();
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
    expect(checklistRepo.verifyCategoryBelongsToTrip).not.toHaveBeenCalled();
  });

  it('returns 404 when the category does not belong to the trip', async () => {
    vi.mocked(checklistRepo.verifyCategoryBelongsToTrip).mockResolvedValue(
      false,
    );
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
      body: { name: 'Gear' },
    });

    await updateTripCategory(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
    expect(checklistRepo.updateTripCategory).not.toHaveBeenCalled();
  });

  it('returns 404 when the update resolves false', async () => {
    vi.mocked(checklistRepo.verifyCategoryBelongsToTrip).mockResolvedValue(
      true,
    );
    vi.mocked(checklistRepo.updateTripCategory).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
      body: { name: 'Gear' },
    });

    await updateTripCategory(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
  });

  it('returns 204 with no body on success', async () => {
    vi.mocked(checklistRepo.verifyCategoryBelongsToTrip).mockResolvedValue(
      true,
    );
    vi.mocked(checklistRepo.updateTripCategory).mockResolvedValue(true);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
      body: { name: 'Gear' },
    });

    await updateTripCategory(req, res);

    expect(checklistRepo.updateTripCategory).toHaveBeenCalledWith(2, 'Gear');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('deleteTripCategory', () => {
  it('returns 404 when the category does not belong to the trip', async () => {
    vi.mocked(checklistRepo.verifyCategoryBelongsToTrip).mockResolvedValue(
      false,
    );
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
    });

    await deleteTripCategory(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
    expect(checklistRepo.deleteTripCategory).not.toHaveBeenCalled();
  });

  it('returns 404 when the delete resolves false', async () => {
    vi.mocked(checklistRepo.verifyCategoryBelongsToTrip).mockResolvedValue(
      true,
    );
    vi.mocked(checklistRepo.deleteTripCategory).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
    });

    await deleteTripCategory(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
  });

  it('returns 204 on success', async () => {
    vi.mocked(checklistRepo.verifyCategoryBelongsToTrip).mockResolvedValue(
      true,
    );
    vi.mocked(checklistRepo.deleteTripCategory).mockResolvedValue(true);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
    });

    await deleteTripCategory(req, res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe('unexpected repository errors', () => {
  const tests: RejectCase[] = [
    {
      name: 'addTripCategory',
      handler: addTripCategory,
      req: { params: { tripId: '1' }, body: { name: 'Gear' } },
      arrange: error =>
        vi.mocked(checklistRepo.createTripCategory).mockRejectedValue(error),
    },
    {
      name: 'updateTripCategory',
      handler: updateTripCategory,
      req: { params: { tripId: '1', catId: '2' }, body: { name: 'Gear' } },
      arrange: error =>
        vi
          .mocked(checklistRepo.verifyCategoryBelongsToTrip)
          .mockRejectedValue(error),
    },
    {
      name: 'deleteTripCategory',
      handler: deleteTripCategory,
      req: { params: { tripId: '1', catId: '2' } },
      arrange: error =>
        vi
          .mocked(checklistRepo.verifyCategoryBelongsToTrip)
          .mockRejectedValue(error),
    },
  ];

  itRejects(tests);
});
