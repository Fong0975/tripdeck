import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as templateRepo from '../../repositories/checklist/template';
import { createMockReqRes, expectJsonStatus } from '../../test-utils/httpMocks';

import {
  addCategory,
  deleteCategory,
  getTemplate,
  updateCategory,
} from './templateCategoryController';

vi.mock('../../repositories/checklist/template');

const invalidNameCases = [
  { label: 'name is missing', body: {} },
  { label: 'name is an empty string', body: { name: '' } },
  { label: 'name is not a string', body: { name: 42 } },
];

beforeEach(() => {
  vi.clearAllMocks();
});

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
      name: 'getTemplate',
      handler: getTemplate,
      configureRejection: error =>
        vi.mocked(templateRepo.findTemplate).mockRejectedValue(error),
      expectedError: 'Failed to fetch template',
    },
    {
      name: 'addCategory',
      handler: addCategory,
      body: { name: 'Camping Gear' },
      configureRejection: error =>
        vi.mocked(templateRepo.createCategory).mockRejectedValue(error),
      expectedError: 'Failed to add category',
    },
    {
      name: 'updateCategory',
      handler: updateCategory,
      params: { catId: '1' },
      body: { name: 'Camping Gear' },
      configureRejection: error =>
        vi.mocked(templateRepo.updateCategory).mockRejectedValue(error),
      expectedError: 'Failed to update category',
    },
    {
      name: 'deleteCategory',
      handler: deleteCategory,
      params: { catId: '1' },
      configureRejection: error =>
        vi.mocked(templateRepo.deleteCategory).mockRejectedValue(error),
      expectedError: 'Failed to delete category',
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
