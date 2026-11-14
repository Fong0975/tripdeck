import { describe, expect, it, vi } from 'vitest';

import * as templateRepo from '../../repositories/checklist/template';
import { invalidNameCases } from '../../test-utils/fixtures';
import {
  createMockReqRes,
  expectJsonStatus,
  type MockReqOverrides,
} from '../../test-utils/httpMocks';

import {
  addTemplateItem,
  deleteTemplateItem,
  updateTemplateItem,
} from './templateItemController';

vi.mock('../../repositories/checklist/template', () => ({
  createItem: vi.fn(),
  deleteItem: vi.fn(),
  updateItem: vi.fn(),
  verifyItemBelongsToCategory: vi.fn(),
}));

const blankNameCases = [
  ...invalidNameCases,
  { label: 'name is whitespace only', body: { name: '   ' } },
];

describe('addTemplateItem', () => {
  it.each(blankNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({ params: { catId: '1' }, body });

    await addTemplateItem(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(templateRepo.createItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the category does not exist', async () => {
    vi.mocked(templateRepo.createItem).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { catId: '1' },
      body: { name: 'e-Visa' },
    });

    await addTemplateItem(req, res);

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

    await addTemplateItem(req, res);

    expect(templateRepo.createItem).toHaveBeenCalledWith(1, {
      name: 'e-Visa',
      quantity: undefined,
      notes: undefined,
      storage_location: undefined,
    });
    expectJsonStatus(res, 201, item);
  });
});

describe('updateTemplateItem', () => {
  it.each(blankNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2' },
      body,
    });

    await updateTemplateItem(req, res);

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

    await updateTemplateItem(req, res);

    expect(templateRepo.verifyItemBelongsToCategory).toHaveBeenCalledWith(2, 1);
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

    await updateTemplateItem(req, res);

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
      body: { name: 'Charger', quantity: 2 },
    });

    await updateTemplateItem(req, res);

    expect(templateRepo.updateItem).toHaveBeenCalledWith(2, {
      name: 'Charger',
      quantity: 2,
      notes: undefined,
      storage_location: undefined,
    });
    expect(res.json).toHaveBeenCalledWith(item);
  });
});

describe('deleteTemplateItem', () => {
  it('returns 404 when the item does not belong to the category', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
      false,
    );
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2' },
    });

    await deleteTemplateItem(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(templateRepo.deleteItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the delete resolves false', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(true);
    vi.mocked(templateRepo.deleteItem).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2' },
    });

    await deleteTemplateItem(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
  });

  it('returns 204 on success', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(true);
    vi.mocked(templateRepo.deleteItem).mockResolvedValue(true);
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2' },
    });

    await deleteTemplateItem(req, res);

    expect(templateRepo.deleteItem).toHaveBeenCalledWith(2);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe('unexpected repository errors', () => {
  const tests: Array<{
    name: string;
    handler: typeof addTemplateItem;
    req: MockReqOverrides;
    arrange: (error: Error) => void;
  }> = [
    {
      name: 'addTemplateItem',
      handler: addTemplateItem,
      req: { params: { catId: '1' }, body: { name: 'Tent' } },
      arrange: error =>
        vi.mocked(templateRepo.createItem).mockRejectedValue(error),
    },
    {
      name: 'updateTemplateItem',
      handler: updateTemplateItem,
      req: { params: { catId: '1', itemId: '2' }, body: { name: 'Tent' } },
      arrange: error =>
        vi
          .mocked(templateRepo.verifyItemBelongsToCategory)
          .mockRejectedValue(error),
    },
    {
      name: 'deleteTemplateItem',
      handler: deleteTemplateItem,
      req: { params: { catId: '1', itemId: '2' } },
      arrange: error =>
        vi
          .mocked(templateRepo.verifyItemBelongsToCategory)
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
