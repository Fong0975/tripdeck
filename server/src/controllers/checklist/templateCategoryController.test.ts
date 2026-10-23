import { describe, expect, it, vi } from 'vitest';

import * as templateRepo from '../../repositories/checklist/template';
import { invalidNameCases } from '../../test-utils/fixtures';
import {
  createMockReqRes,
  expectJsonStatus,
  itReturns500,
  type Returns500Case,
} from '../../test-utils/httpMocks';

import {
  addCategory,
  deleteCategory,
  getTemplate,
  updateCategory,
} from './templateCategoryController';

vi.mock('../../repositories/checklist/template', () => ({
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  findTemplate: vi.fn(),
  updateCategory: vi.fn(),
}));

describe('getTemplate', () => {
  it('returns 200 with the template', async () => {
    const template = { categories: [] };
    vi.mocked(templateRepo.findTemplate).mockResolvedValue(template);
    const { req, res } = createMockReqRes();

    await getTemplate(req, res);

    expect(res.json).toHaveBeenCalledWith(template);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('addCategory', () => {
  it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({ body });

    await addCategory(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(templateRepo.createCategory).not.toHaveBeenCalled();
  });

  it('returns 201 with the created category', async () => {
    const category = { id: 7, name: 'Sports Gear', items: [] };
    vi.mocked(templateRepo.createCategory).mockResolvedValue(category);
    const { req, res } = createMockReqRes({ body: { name: 'Sports Gear' } });

    await addCategory(req, res);

    expect(templateRepo.createCategory).toHaveBeenCalledWith('Sports Gear');
    expectJsonStatus(res, 201, category);
  });
});

describe('updateCategory', () => {
  it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({ params: { catId: '1' }, body });

    await updateCategory(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(templateRepo.updateCategory).not.toHaveBeenCalled();
  });

  it('returns 404 when the category does not exist', async () => {
    vi.mocked(templateRepo.updateCategory).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { catId: '1' },
      body: { name: 'Documents' },
    });

    await updateCategory(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
  });

  it('returns 200 with the updated category', async () => {
    const category = { id: 1, name: 'Documents', items: [] };
    vi.mocked(templateRepo.updateCategory).mockResolvedValue(category);
    const { req, res } = createMockReqRes({
      params: { catId: '1' },
      body: { name: 'Documents' },
    });

    await updateCategory(req, res);

    expect(templateRepo.updateCategory).toHaveBeenCalledWith(1, 'Documents');
    expect(res.json).toHaveBeenCalledWith(category);
  });
});

describe('deleteCategory', () => {
  it('returns 404 when the category does not exist', async () => {
    vi.mocked(templateRepo.deleteCategory).mockResolvedValue(false);
    const { req, res } = createMockReqRes({ params: { catId: '1' } });

    await deleteCategory(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
  });

  it('returns 204 on success', async () => {
    vi.mocked(templateRepo.deleteCategory).mockResolvedValue(true);
    const { req, res } = createMockReqRes({ params: { catId: '1' } });

    await deleteCategory(req, res);

    expect(templateRepo.deleteCategory).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe('500 responses', () => {
  const failureCases: Returns500Case[] = [
    {
      name: 'getTemplate',
      handler: getTemplate,
      arrange: error =>
        vi.mocked(templateRepo.findTemplate).mockRejectedValue(error),
      expectedError: 'Failed to fetch template',
    },
    {
      name: 'addCategory',
      handler: addCategory,
      req: { body: { name: 'Camping Gear' } },
      arrange: error =>
        vi.mocked(templateRepo.createCategory).mockRejectedValue(error),
      expectedError: 'Failed to add category',
    },
    {
      name: 'updateCategory',
      handler: updateCategory,
      req: { params: { catId: '1' }, body: { name: 'Camping Gear' } },
      arrange: error =>
        vi.mocked(templateRepo.updateCategory).mockRejectedValue(error),
      expectedError: 'Failed to update category',
    },
    {
      name: 'deleteCategory',
      handler: deleteCategory,
      req: { params: { catId: '1' } },
      arrange: error =>
        vi.mocked(templateRepo.deleteCategory).mockRejectedValue(error),
      expectedError: 'Failed to delete category',
    },
  ];

  itReturns500(failureCases);
});
