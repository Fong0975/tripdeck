import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as templateRepo from '../../repositories/checklist/template';
import { createMockReqRes, expectJsonStatus } from '../../test-utils/httpMocks';

import {
  addTemplateItemSpec,
  deleteTemplateItemSpec,
  updateTemplateItemSpec,
} from './templateItemSpecController';

vi.mock('../../repositories/checklist/template');

const invalidNameCases = [
  { label: 'name is missing', body: {} },
  { label: 'name is an empty string', body: { name: '' } },
  { label: 'name is not a string', body: { name: 42 } },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('addTemplateItemSpec', () => {
  it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2' },
      body,
    });

    await addTemplateItemSpec(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(templateRepo.verifyItemBelongsToCategory).not.toHaveBeenCalled();
  });

  it('returns 404 when the item does not belong to the category', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
      false,
    );
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2' },
      body: { name: 'Type-C charger' },
    });

    await addTemplateItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(templateRepo.createItemSpec).not.toHaveBeenCalled();
  });

  it('returns 404 when the created spec resolves null', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(true);
    vi.mocked(templateRepo.createItemSpec).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2' },
      body: { name: 'Type-C charger' },
    });

    await addTemplateItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
  });

  it('returns 201 with the created spec', async () => {
    const spec = { id: 1, name: 'Type-C charger', storage_location: null };
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(true);
    vi.mocked(templateRepo.createItemSpec).mockResolvedValue(spec);
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2' },
      body: { name: 'Type-C charger' },
    });

    await addTemplateItemSpec(req, res);

    expect(templateRepo.createItemSpec).toHaveBeenCalledWith(2, {
      name: 'Type-C charger',
      storage_location: undefined,
    });
    expectJsonStatus(res, 201, spec);
  });
});

describe('updateTemplateItemSpec', () => {
  it.each(invalidNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2', specId: '3' },
      body,
    });

    await updateTemplateItemSpec(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(templateRepo.verifyItemBelongsToCategory).not.toHaveBeenCalled();
  });

  it('returns 404 when the item does not belong to the category', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
      false,
    );
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2', specId: '3' },
      body: { name: 'Type-C charger' },
    });

    await updateTemplateItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(templateRepo.verifySpecBelongsToItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the spec does not belong to the item', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(true);
    vi.mocked(templateRepo.verifySpecBelongsToItem).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2', specId: '3' },
      body: { name: 'Type-C charger' },
    });

    await updateTemplateItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Spec not found' });
    expect(templateRepo.updateItemSpec).not.toHaveBeenCalled();
  });

  it('returns 404 when the update resolves null', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(true);
    vi.mocked(templateRepo.verifySpecBelongsToItem).mockResolvedValue(true);
    vi.mocked(templateRepo.updateItemSpec).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2', specId: '3' },
      body: { name: 'Type-C charger' },
    });

    await updateTemplateItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Spec not found' });
  });

  it('returns 200 with the updated spec', async () => {
    const spec = { id: 3, name: 'Type-C charger', storage_location: null };
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(true);
    vi.mocked(templateRepo.verifySpecBelongsToItem).mockResolvedValue(true);
    vi.mocked(templateRepo.updateItemSpec).mockResolvedValue(spec);
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2', specId: '3' },
      body: { name: 'Type-C charger' },
    });

    await updateTemplateItemSpec(req, res);

    expect(res.json).toHaveBeenCalledWith(spec);
  });
});

describe('deleteTemplateItemSpec', () => {
  it('returns 404 when the item does not belong to the category', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(
      false,
    );
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2', specId: '3' },
    });

    await deleteTemplateItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(templateRepo.verifySpecBelongsToItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the spec does not belong to the item', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(true);
    vi.mocked(templateRepo.verifySpecBelongsToItem).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2', specId: '3' },
    });

    await deleteTemplateItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Spec not found' });
    expect(templateRepo.deleteItemSpec).not.toHaveBeenCalled();
  });

  it('returns 404 when the delete resolves false', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(true);
    vi.mocked(templateRepo.verifySpecBelongsToItem).mockResolvedValue(true);
    vi.mocked(templateRepo.deleteItemSpec).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2', specId: '3' },
    });

    await deleteTemplateItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Spec not found' });
  });

  it('returns 204 on success', async () => {
    vi.mocked(templateRepo.verifyItemBelongsToCategory).mockResolvedValue(true);
    vi.mocked(templateRepo.verifySpecBelongsToItem).mockResolvedValue(true);
    vi.mocked(templateRepo.deleteItemSpec).mockResolvedValue(true);
    const { req, res } = createMockReqRes({
      params: { catId: '1', itemId: '2', specId: '3' },
    });

    await deleteTemplateItemSpec(req, res);

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
      name: 'addTemplateItemSpec',
      handler: addTemplateItemSpec,
      params: { catId: '1', itemId: '2' },
      body: { name: 'Type-C charger' },
      configureRejection: error =>
        vi
          .mocked(templateRepo.verifyItemBelongsToCategory)
          .mockRejectedValue(error),
      expectedError: 'Failed to add spec',
    },
    {
      name: 'updateTemplateItemSpec',
      handler: updateTemplateItemSpec,
      params: { catId: '1', itemId: '2', specId: '3' },
      body: { name: 'Type-C charger' },
      configureRejection: error =>
        vi
          .mocked(templateRepo.verifyItemBelongsToCategory)
          .mockRejectedValue(error),
      expectedError: 'Failed to update spec',
    },
    {
      name: 'deleteTemplateItemSpec',
      handler: deleteTemplateItemSpec,
      params: { catId: '1', itemId: '2', specId: '3' },
      configureRejection: error =>
        vi
          .mocked(templateRepo.verifyItemBelongsToCategory)
          .mockRejectedValue(error),
      expectedError: 'Failed to delete spec',
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
