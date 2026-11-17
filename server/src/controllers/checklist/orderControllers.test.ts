import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as templateRepo from '../../repositories/checklist/template';
import * as tripRepo from '../../repositories/checklist/trip';
import { createMockReqRes, expectJsonStatus } from '../../test-utils/httpMocks';

import { reorderTemplateCategories } from './templateCategoryController';
import {
  moveTemplateItem,
  reorderTemplateItems,
} from './templateItemController';
import { reorderTripCategories } from './tripCategoryController';
import { moveTripItem, reorderTripItems } from './tripItemController';

vi.mock('../../repositories/checklist/template', () => ({
  reorderCategories: vi.fn(),
  reorderItems: vi.fn(),
  moveItem: vi.fn(),
  categoryExists: vi.fn(),
  verifyItemBelongsToCategory: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}));

vi.mock('../../repositories/checklist/trip', () => ({
  tripExists: vi.fn(),
  reorderTripCategories: vi.fn(),
  reorderTripItems: vi.fn(),
  moveTripItem: vi.fn(),
  verifyCategoryBelongsToTrip: vi.fn(),
  verifyItemBelongsToTrip: vi.fn(),
  createTripItem: vi.fn(),
  updateTripItem: vi.fn(),
  deleteTripItem: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe('reorderTemplateCategories', () => {
  it.each([
    {
      name: 'a malformed body',
      body: {},
      repo: 'reordered',
      status: 400,
      calls: 0,
    },
    {
      name: 'a stale list',
      body: { orderedIds: [1] },
      repo: 'invalid_order',
      status: 400,
      calls: 1,
    },
    {
      name: 'a matching list',
      body: { orderedIds: [2, 1] },
      repo: 'reordered',
      status: 204,
      calls: 1,
    },
  ])('responds $status for $name', async ({ body, repo, status, calls }) => {
    vi.mocked(templateRepo.reorderCategories).mockResolvedValue(repo as never);
    const { req, res } = createMockReqRes({ body });

    await reorderTemplateCategories(req, res);

    expect(res.status).toHaveBeenCalledWith(status);
    expect(templateRepo.reorderCategories).toHaveBeenCalledTimes(calls);
  });
});

describe('reorderTemplateItems', () => {
  it('returns 404 when the category does not exist', async () => {
    vi.mocked(templateRepo.categoryExists).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { catId: '4' },
      body: { orderedIds: [1] },
    });

    await reorderTemplateItems(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
    expect(templateRepo.reorderItems).not.toHaveBeenCalled();
  });

  it('reorders the category items and returns 204', async () => {
    vi.mocked(templateRepo.categoryExists).mockResolvedValue(true);
    vi.mocked(templateRepo.reorderItems).mockResolvedValue('reordered');
    const { req, res } = createMockReqRes({
      params: { catId: '4' },
      body: { orderedIds: [2, 1] },
    });

    await reorderTemplateItems(req, res);

    expect(templateRepo.reorderItems).toHaveBeenCalledWith(4, [2, 1]);
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('moveTemplateItem', () => {
  const params = { catId: '4', itemId: '7' };

  it.each([
    {
      name: 'a body without a target',
      body: {},
      owns: true,
      repo: 'moved',
      status: 400,
      json: { error: 'targetCategoryId must be a positive integer' },
    },
    {
      name: 'an item outside the category',
      body: { targetCategoryId: 9 },
      owns: false,
      repo: 'moved',
      status: 404,
      json: { error: 'Item not found' },
    },
    {
      name: 'a missing item on move',
      body: { targetCategoryId: 9 },
      owns: true,
      repo: 'item_not_found',
      status: 404,
      json: { error: 'Item not found' },
    },
    {
      name: 'a missing target category',
      body: { targetCategoryId: 9 },
      owns: true,
      repo: 'category_not_found',
      status: 404,
      json: { error: 'Category not found' },
    },
    {
      name: 'a successful move',
      body: { targetCategoryId: 9 },
      owns: true,
      repo: 'moved',
      status: 204,
      json: undefined,
    },
  ])(
    'responds $status for $name',
    async ({ body, owns, repo, status, json }) => {
      vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
        owns,
      );
      vi.mocked(templateRepo.moveItem).mockResolvedValue(repo as never);
      const { req, res } = createMockReqRes({ params, body });

      await moveTemplateItem(req, res);

      expectJsonStatus(res, status, json);
      if (status === 204) {
        expect(templateRepo.moveItem).toHaveBeenCalledWith(7, 9);
      }
    },
  );
});

describe('reorderTripCategories', () => {
  it('returns 404 when the trip does not exist', async () => {
    vi.mocked(tripRepo.tripExists).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1' },
      body: { orderedIds: [1] },
    });

    await reorderTripCategories(req, res);

    expectJsonStatus(res, 404, { error: 'Trip not found' });
    expect(tripRepo.reorderTripCategories).not.toHaveBeenCalled();
  });

  it.each([
    { repo: 'invalid_order', status: 400 },
    { repo: 'reordered', status: 204 },
  ])(
    'responds $status when the repository returns $repo',
    async ({ repo, status }) => {
      vi.mocked(tripRepo.tripExists).mockResolvedValue(true);
      vi.mocked(tripRepo.reorderTripCategories).mockResolvedValue(
        repo as never,
      );
      const { req, res } = createMockReqRes({
        params: { tripId: '1' },
        body: { orderedIds: [2, 1] },
      });

      await reorderTripCategories(req, res);

      expect(tripRepo.reorderTripCategories).toHaveBeenCalledWith(1, [2, 1]);
      expect(res.status).toHaveBeenCalledWith(status);
    },
  );
});

describe('reorderTripItems', () => {
  it('returns 404 when the category is not in the trip', async () => {
    vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
      body: { orderedIds: [1] },
    });

    await reorderTripItems(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
    expect(tripRepo.reorderTripItems).not.toHaveBeenCalled();
  });

  it('reorders the category items and returns 204', async () => {
    vi.mocked(tripRepo.verifyCategoryBelongsToTrip).mockResolvedValue(true);
    vi.mocked(tripRepo.reorderTripItems).mockResolvedValue('reordered');
    const { req, res } = createMockReqRes({
      params: { tripId: '1', catId: '2' },
      body: { orderedIds: [2, 1] },
    });

    await reorderTripItems(req, res);

    expect(tripRepo.reorderTripItems).toHaveBeenCalledWith(2, [2, 1]);
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('moveTripItem', () => {
  const params = { tripId: '1', itemId: '7' };

  it.each([
    {
      name: 'a body without a target',
      body: {},
      repo: 'moved',
      status: 400,
      json: { error: 'targetCategoryId must be a positive integer' },
    },
    {
      name: 'an item outside the trip',
      body: { targetCategoryId: 9 },
      repo: 'item_not_found',
      status: 404,
      json: { error: 'Item not found' },
    },
    {
      name: 'a target category outside the trip',
      body: { targetCategoryId: 9 },
      repo: 'category_not_found',
      status: 404,
      json: { error: 'Category not found' },
    },
    {
      name: 'a successful move',
      body: { targetCategoryId: 9 },
      repo: 'moved',
      status: 204,
      json: undefined,
    },
  ])('responds $status for $name', async ({ body, repo, status, json }) => {
    vi.mocked(tripRepo.moveTripItem).mockResolvedValue(repo as never);
    const { req, res } = createMockReqRes({ params, body });

    await moveTripItem(req, res);

    expectJsonStatus(res, status, json);
    if (status === 204) {
      expect(tripRepo.moveTripItem).toHaveBeenCalledWith(1, 7, 9);
    }
  });
});
