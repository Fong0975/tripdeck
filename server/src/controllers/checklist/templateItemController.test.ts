import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as templateRepo from '../../repositories/checklist/template';
import { createMockReqRes, expectJsonStatus } from '../../test-utils/httpMocks';

import { addItem, deleteItem, updateItem } from './templateItemController';

vi.mock('../../repositories/checklist/template');

const invalidNameCases = [
  { label: 'name is missing', body: {} },
  { label: 'name is an empty string', body: { name: '' } },
  { label: 'name is not a string', body: { name: 42 } },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('addItem', () => {
  it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({ params: { catId: '1' }, body });

    await addItem(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(templateRepo.createItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the category does not exist', async () => {
    vi.mocked(templateRepo.createItem).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { catId: '1' },
      body: { name: 'e-Visa' },
    });

    await addItem(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
  });

  it('returns 201 with the created item', async () => {
    const item = {
      id: 32,
      name: 'e-Visa',
      quantity: null,
      notes: null,
      storage_location: null,
      specs: [],
    };
    vi.mocked(templateRepo.createItem).mockResolvedValue(item);
    const { req, res } = createMockReqRes({
      params: { catId: '1' },
      body: { name: 'e-Visa' },
    });

    await addItem(req, res);

    expect(templateRepo.createItem).toHaveBeenCalledWith(1, {
      name: 'e-Visa',
      quantity: undefined,
      notes: undefined,
      storage_location: undefined,
    });
    expectJsonStatus(res, 201, item);
  });
});

describe('updateItem', () => {
  it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2' },
      body,
    });

    await updateItem(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(templateRepo.verifyItemBelongsToCategory).not.toHaveBeenCalled();
  });

  it('returns 404 when the item does not belong to the category', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
      false,
    );
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2' },
      body: { name: 'Charger' },
    });

    await updateItem(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(templateRepo.updateItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the update resolves null', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(true);
    vi.mocked(templateRepo.updateItem).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2' },
      body: { name: 'Charger' },
    });

    await updateItem(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
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
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(true);
    vi.mocked(templateRepo.updateItem).mockResolvedValue(item);
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2' },
      body: { name: 'Charger' },
    });

    await updateItem(req, res);

    expect(res.json).toHaveBeenCalledWith(item);
  });
});

describe('deleteItem', () => {
  it('returns 404 when the item does not belong to the category', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
      false,
    );
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2' },
    });

    await deleteItem(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(templateRepo.deleteItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the delete resolves false', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(true);
    vi.mocked(templateRepo.deleteItem).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2' },
    });

    await deleteItem(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
  });

  it('returns 204 on success', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(true);
    vi.mocked(templateRepo.deleteItem).mockResolvedValue(true);
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2' },
    });

    await deleteItem(req, res);

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
      name: 'addItem',
      handler: addItem,
      params: { catId: '1' },
      body: { name: 'Tent' },
      configureRejection: error =>
        vi.mocked(templateRepo.createItem).mockRejectedValue(error),
      expectedError: 'Failed to add item',
    },
    {
      name: 'updateItem',
      handler: updateItem,
      params: { catId: '1', itemId: '2' },
      body: { name: 'Tent' },
      configureRejection: error =>
        vi
          .mocked(templateRepo.verifyItemBelongsToCategory)
          .mockRejectedValue(error),
      expectedError: 'Failed to update item',
    },
    {
      name: 'deleteItem',
      handler: deleteItem,
      params: { catId: '1', itemId: '2' },
      configureRejection: error =>
        vi
          .mocked(templateRepo.verifyItemBelongsToCategory)
          .mockRejectedValue(error),
      expectedError: 'Failed to delete item',
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
