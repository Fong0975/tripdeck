import { describe, expect, it, vi } from 'vitest';

import * as labelRepo from '../../repositories/checklist/locationLabelRepository';
import {
  createMockReqRes,
  expectJsonStatus,
  itRejects,
  type RejectCase,
} from '../../test-utils/httpMocks';

import {
  addLocationLabel,
  deleteLocationLabel,
  getLocationLabels,
  reorderLocationLabels,
  updateLocationLabel,
} from './locationLabelController';
import { LABEL_EXISTS_ERROR } from './shared/locationLabelValidation';

vi.mock('../../repositories/checklist/locationLabelRepository', () => ({
  createLocationLabel: vi.fn(),
  deleteLocationLabel: vi.fn(),
  listLocationLabels: vi.fn(),
  listOrphanLocations: vi.fn(),
  reorderLocationLabels: vi.fn(),
  setLocationLabelShowAsGroup: vi.fn(),
}));

const label = { id: 1, name: '託運', show_as_group: true, sort_order: 0 };

describe('getLocationLabels', () => {
  it('responds with the labels and the orphans of those labels', async () => {
    vi.mocked(labelRepo.listLocationLabels).mockResolvedValue([label]);
    vi.mocked(labelRepo.listOrphanLocations).mockResolvedValue([
      { name: '手提', trip_count: 2 },
    ]);
    const { req, res } = createMockReqRes();

    await getLocationLabels(req, res);

    expect(labelRepo.listOrphanLocations).toHaveBeenCalledWith(['託運']);
    expect(res.json).toHaveBeenCalledWith({
      labels: [label],
      orphans: [{ name: '手提', trip_count: 2 }],
    });
  });
});

describe('addLocationLabel', () => {
  it.each([
    {
      name: 'returns 400 for a blank name',
      body: { name: ' ' },
      status: 400,
      body_: { error: 'name is required' },
      called: false,
    },
    {
      name: 'returns 409 for a name that exists',
      body: { name: '託運' },
      repoResult: { status: 'duplicate' as const },
      status: 409,
      body_: { error: LABEL_EXISTS_ERROR },
      called: true,
    },
    {
      name: 'returns 201 with the created label',
      body: { name: '託運', show_as_group: true },
      repoResult: { status: 'created' as const, label },
      status: 201,
      body_: label,
      called: true,
    },
  ])('$name', async ({ body, repoResult, status, body_, called }) => {
    if (repoResult) {
      vi.mocked(labelRepo.createLocationLabel).mockResolvedValue(repoResult);
    }
    const { req, res } = createMockReqRes({ body });

    await addLocationLabel(req, res);

    expectJsonStatus(res, status, body_);
    expect(vi.mocked(labelRepo.createLocationLabel).mock.calls.length > 0).toBe(
      called,
    );
  });
});

describe('updateLocationLabel', () => {
  it.each([
    {
      name: 'returns 400 when show_as_group is not a boolean',
      body: { show_as_group: 'no' },
      stored: null,
      status: 400,
    },
    {
      name: 'returns 404 when the label does not exist',
      body: { show_as_group: false },
      stored: null,
      status: 404,
    },
    {
      name: 'returns 200 with the updated label',
      body: { show_as_group: false },
      stored: { ...label, show_as_group: false },
      status: 200,
    },
  ])('$name', async ({ body, stored, status }) => {
    vi.mocked(labelRepo.setLocationLabelShowAsGroup).mockResolvedValue(stored);
    const { req, res } = createMockReqRes({ params: { labelId: '1' }, body });

    await updateLocationLabel(req, res);

    if (status === 200) {
      expect(res.json).toHaveBeenCalledWith(stored);
      expect(res.status).not.toHaveBeenCalled();
    } else {
      expect(res.status).toHaveBeenCalledWith(status);
    }
  });
});

describe('reorderLocationLabels', () => {
  it.each([
    {
      name: 'returns 204 when the order is applied',
      body: { orderedIds: [2, 1] },
      result: 'reordered' as const,
      status: 204,
    },
    {
      name: 'returns 400 when the ids do not match the labels',
      body: { orderedIds: [2] },
      result: 'invalid_order' as const,
      status: 400,
    },
    {
      name: 'returns 400 for a malformed body',
      body: { orderedIds: 'x' },
      result: 'reordered' as const,
      status: 400,
    },
  ])('$name', async ({ body, result, status }) => {
    vi.mocked(labelRepo.reorderLocationLabels).mockResolvedValue(result);
    const { req, res } = createMockReqRes({ body });

    await reorderLocationLabels(req, res);

    expect(res.status).toHaveBeenCalledWith(status);
  });
});

describe('deleteLocationLabel', () => {
  it.each([
    {
      name: 'returns 204 when the label is deleted',
      deleted: true,
      status: 204,
    },
    {
      name: 'returns 404 when the label is missing',
      deleted: false,
      status: 404,
    },
  ])('$name', async ({ deleted, status }) => {
    vi.mocked(labelRepo.deleteLocationLabel).mockResolvedValue(deleted);
    const { req, res } = createMockReqRes({ params: { labelId: '1' } });

    await deleteLocationLabel(req, res);

    expect(res.status).toHaveBeenCalledWith(status);
  });
});

describe('error propagation', () => {
  const cases: RejectCase[] = [
    {
      name: 'getLocationLabels',
      handler: getLocationLabels,
      arrange: error =>
        vi.mocked(labelRepo.listLocationLabels).mockRejectedValue(error),
    },
    {
      name: 'addLocationLabel',
      handler: addLocationLabel,
      req: { body: { name: '託運' } },
      arrange: error =>
        vi.mocked(labelRepo.createLocationLabel).mockRejectedValue(error),
    },
    {
      name: 'deleteLocationLabel',
      handler: deleteLocationLabel,
      req: { params: { labelId: '1' } },
      arrange: error =>
        vi.mocked(labelRepo.deleteLocationLabel).mockRejectedValue(error),
    },
  ];

  itRejects(cases);
});
