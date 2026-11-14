import { describe, expect, it, vi } from 'vitest';

import * as templateRepo from '../../repositories/checklist/template';
import { invalidNameCases } from '../../test-utils/fixtures';
import {
  createMockReqRes,
  expectJsonStatus,
  type MockReqOverrides,
} from '../../test-utils/httpMocks';

import {
  addTemplateCategory,
  deleteTemplateCategory,
  getTemplate,
  updateTemplateCategory,
} from './templateCategoryController';

vi.mock('../../repositories/checklist/template', () => ({
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  findTemplate: vi.fn(),
  updateCategory: vi.fn(),
}));

const blankNameCases = [
  ...invalidNameCases,
  { label: 'name is whitespace only', body: { name: '   ' } },
];

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

describe('addTemplateCategory', () => {
  it.each(blankNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({ body });

    await addTemplateCategory(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(templateRepo.createCategory).not.toHaveBeenCalled();
  });

  it('returns 201 with the created category', async () => {
    const category = { id: 7, name: 'Sports Gear', items: [] };
    vi.mocked(templateRepo.createCategory).mockResolvedValue(category);
    const { req, res } = createMockReqRes({ body: { name: 'Sports Gear' } });

    await addTemplateCategory(req, res);

    expect(templateRepo.createCategory).toHaveBeenCalledWith('Sports Gear');
    expectJsonStatus(res, 201, category);
  });
});

describe('updateTemplateCategory', () => {
  it.each(blankNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({ params: { catId: '1' }, body });

    await updateTemplateCategory(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(templateRepo.updateCategory).not.toHaveBeenCalled();
  });

  it('returns 404 when the category does not exist', async () => {
    vi.mocked(templateRepo.updateCategory).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { catId: '1' },
      body: { name: 'Documents' },
    });

    await updateTemplateCategory(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
  });

  it('returns 200 with the updated category', async () => {
    const category = { id: 1, name: 'Documents', items: [] };
    vi.mocked(templateRepo.updateCategory).mockResolvedValue(category);
    const { req, res } = createMockReqRes({
      params: { catId: '1' },
      body: { name: 'Documents' },
    });

    await updateTemplateCategory(req, res);

    expect(templateRepo.updateCategory).toHaveBeenCalledWith(1, 'Documents');
    expect(res.json).toHaveBeenCalledWith(category);
  });
});

describe('deleteTemplateCategory', () => {
  it('returns 404 when the category does not exist', async () => {
    vi.mocked(templateRepo.deleteCategory).mockResolvedValue(false);
    const { req, res } = createMockReqRes({ params: { catId: '1' } });

    await deleteTemplateCategory(req, res);

    expectJsonStatus(res, 404, { error: 'Category not found' });
  });

  it('returns 204 on success', async () => {
    vi.mocked(templateRepo.deleteCategory).mockResolvedValue(true);
    const { req, res } = createMockReqRes({ params: { catId: '1' } });

    await deleteTemplateCategory(req, res);

    expect(templateRepo.deleteCategory).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe('unexpected repository errors', () => {
  const tests: Array<{
    name: string;
    handler: typeof getTemplate;
    req?: MockReqOverrides;
    arrange: (error: Error) => void;
  }> = [
    {
      name: 'getTemplate',
      handler: getTemplate,
      arrange: error =>
        vi.mocked(templateRepo.findTemplate).mockRejectedValue(error),
    },
    {
      name: 'addTemplateCategory',
      handler: addTemplateCategory,
      req: { body: { name: 'Camping Gear' } },
      arrange: error =>
        vi.mocked(templateRepo.createCategory).mockRejectedValue(error),
    },
    {
      name: 'updateTemplateCategory',
      handler: updateTemplateCategory,
      req: { params: { catId: '1' }, body: { name: 'Camping Gear' } },
      arrange: error =>
        vi.mocked(templateRepo.updateCategory).mockRejectedValue(error),
    },
    {
      name: 'deleteTemplateCategory',
      handler: deleteTemplateCategory,
      req: { params: { catId: '1' } },
      arrange: error =>
        vi.mocked(templateRepo.deleteCategory).mockRejectedValue(error),
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
