import { describe, expect, it, vi } from 'vitest';

import * as checklistRepo from '../../repositories/checklist/trip';
import { invalidNameCases } from '../../test-utils/fixtures';
import {
  createMockReqRes,
  expectJsonStatus,
  itRejects,
  type RejectCase,
} from '../../test-utils/httpMocks';

import {
  addTripItemSpec,
  deleteTripItemSpec,
  setSpecCheck,
  updateTripItemSpec,
} from './tripItemSpecController';

vi.mock('../../repositories/checklist/trip', () => ({
  createTripItemSpec: vi.fn(),
  deleteTripItemSpec: vi.fn(),
  getSpecCheckLocations: vi.fn(),
  setSpecCheck: vi.fn(),
  updateTripItemSpec: vi.fn(),
  verifyItemBelongsToTrip: vi.fn(),
  verifyOccasionBelongsToTrip: vi.fn(),
  verifyTripSpecBelongsToItem: vi.fn(),
}));

vi.mock('../../repositories/checklist/locationLabelRepository', () => ({
  findDisallowedLocation: vi.fn().mockResolvedValue(null),
}));

const blankNameCases = [
  ...invalidNameCases,
  { label: 'name is whitespace only', body: { name: '   ' } },
];

describe('addTripItemSpec', () => {
  it.each(blankNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body,
    });

    await addTripItemSpec(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(checklistRepo.verifyItemBelongsToTrip).not.toHaveBeenCalled();
  });

  it('returns 404 when the item does not belong to the trip', async () => {
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body: { name: 'Type-C charger' },
    });

    await addTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(checklistRepo.createTripItemSpec).not.toHaveBeenCalled();
  });

  it('returns 404 when the created spec resolves null', async () => {
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(checklistRepo.createTripItemSpec).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body: { name: 'Type-C charger' },
    });

    await addTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
  });

  it('returns 201 with the created spec', async () => {
    const spec = { id: 1, name: 'Type-C charger', storage_location: null };
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(checklistRepo.createTripItemSpec).mockResolvedValue(spec);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2' },
      body: { name: 'Type-C charger' },
    });

    await addTripItemSpec(req, res);

    expect(checklistRepo.createTripItemSpec).toHaveBeenCalledWith(2, {
      name: 'Type-C charger',
      storage_location: undefined,
    });
    expectJsonStatus(res, 201, spec);
  });
});

describe('updateTripItemSpec', () => {
  it.each(blankNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
      body,
    });

    await updateTripItemSpec(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(checklistRepo.verifyItemBelongsToTrip).not.toHaveBeenCalled();
  });

  it('returns 404 when the item does not belong to the trip', async () => {
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
      body: { name: 'Type-C charger' },
    });

    await updateTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(checklistRepo.verifyTripSpecBelongsToItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the spec does not belong to the item', async () => {
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(checklistRepo.verifyTripSpecBelongsToItem).mockResolvedValue(
      false,
    );
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
      body: { name: 'Type-C charger' },
    });

    await updateTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Spec not found' });
    expect(checklistRepo.updateTripItemSpec).not.toHaveBeenCalled();
  });

  it('returns 404 when the update resolves null', async () => {
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(checklistRepo.verifyTripSpecBelongsToItem).mockResolvedValue(
      true,
    );
    vi.mocked(checklistRepo.updateTripItemSpec).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
      body: { name: 'Type-C charger' },
    });

    await updateTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Spec not found' });
  });

  it('returns 200 with the updated spec', async () => {
    const spec = { id: 3, name: 'Type-C charger', storage_location: null };
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(checklistRepo.verifyTripSpecBelongsToItem).mockResolvedValue(
      true,
    );
    vi.mocked(checklistRepo.updateTripItemSpec).mockResolvedValue(spec);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
      body: { name: 'Type-C charger' },
    });

    await updateTripItemSpec(req, res);

    expect(checklistRepo.verifyItemBelongsToTrip).toHaveBeenCalledWith(2, 1);
    expect(checklistRepo.verifyTripSpecBelongsToItem).toHaveBeenCalledWith(
      3,
      2,
    );
    expect(checklistRepo.updateTripItemSpec).toHaveBeenCalledWith(3, {
      name: 'Type-C charger',
      storage_location: undefined,
    });
    expect(res.json).toHaveBeenCalledWith(spec);
  });
});

describe('deleteTripItemSpec', () => {
  it('returns 404 when the item does not belong to the trip', async () => {
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
    });

    await deleteTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Item not found' });
    expect(checklistRepo.verifyTripSpecBelongsToItem).not.toHaveBeenCalled();
  });

  it('returns 404 when the spec does not belong to the item', async () => {
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(checklistRepo.verifyTripSpecBelongsToItem).mockResolvedValue(
      false,
    );
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
    });

    await deleteTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Spec not found' });
    expect(checklistRepo.deleteTripItemSpec).not.toHaveBeenCalled();
  });

  it('returns 404 when the delete resolves false', async () => {
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(checklistRepo.verifyTripSpecBelongsToItem).mockResolvedValue(
      true,
    );
    vi.mocked(checklistRepo.deleteTripItemSpec).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
    });

    await deleteTripItemSpec(req, res);

    expectJsonStatus(res, 404, { error: 'Spec not found' });
  });

  it('returns 204 on success', async () => {
    vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
    vi.mocked(checklistRepo.verifyTripSpecBelongsToItem).mockResolvedValue(
      true,
    );
    vi.mocked(checklistRepo.deleteTripItemSpec).mockResolvedValue(true);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', itemId: '2', specId: '3' },
    });

    await deleteTripItemSpec(req, res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe('setSpecCheck', () => {
  const params = { tripId: '1', occId: '2', itemId: '3', specId: '4' };

  it.each([
    {
      label: 'checked is not a boolean',
      body: { checked: 'true', location: '託運' },
      error: 'checked must be a boolean',
    },
    {
      label: 'location is missing',
      body: { checked: true },
      error: 'location must be a string',
    },
  ])('returns 400 when $label', async ({ body, error }) => {
    const { req, res } = createMockReqRes({ params, body });

    await setSpecCheck(req, res);

    expectJsonStatus(res, 400, { error });
    expect(checklistRepo.verifyOccasionBelongsToTrip).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'the occasion',
      verified: [false, true, true],
      error: 'Occasion not found',
    },
    {
      label: 'the item',
      verified: [true, false, true],
      error: 'Item not found',
    },
    {
      label: 'the spec',
      verified: [true, true, false],
      error: 'Spec not found',
    },
  ])(
    'returns 404 and writes nothing when $label is not found',
    async ({ verified, error }) => {
      const [occ, item, spec] = verified;
      vi.mocked(checklistRepo.verifyOccasionBelongsToTrip).mockResolvedValue(
        occ,
      );
      vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(item);
      vi.mocked(checklistRepo.verifyTripSpecBelongsToItem).mockResolvedValue(
        spec,
      );
      const { req, res } = createMockReqRes({
        params,
        body: { checked: true, location: '託運' },
      });

      await setSpecCheck(req, res);

      expectJsonStatus(res, 404, { error });
      expect(checklistRepo.setSpecCheck).not.toHaveBeenCalled();
    },
  );

  it.each([
    { checked: true, location: '託運', specLocations: ['託運', '隨身'] },
    { checked: false, location: '隨身', specLocations: ['託運', '隨身'] },
    { checked: true, location: '', specLocations: [''] },
  ])(
    'returns 204 and stores checked=$checked at "$location"',
    async ({ checked, location, specLocations }) => {
      vi.mocked(checklistRepo.verifyOccasionBelongsToTrip).mockResolvedValue(
        true,
      );
      vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      vi.mocked(checklistRepo.verifyTripSpecBelongsToItem).mockResolvedValue(
        true,
      );
      vi.mocked(checklistRepo.getSpecCheckLocations).mockResolvedValue(
        specLocations,
      );
      const { req, res } = createMockReqRes({
        params,
        body: { checked, location },
      });

      await setSpecCheck(req, res);

      expect(checklistRepo.setSpecCheck).toHaveBeenCalledWith(
        2,
        4,
        location,
        checked,
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    },
  );

  it.each([
    { specLocations: ['託運'], location: '隨身' },
    { specLocations: ['託運'], location: '' },
    { specLocations: [''], location: '託運' },
  ])(
    'returns 400 and writes nothing for "$location" on a spec filed under $specLocations',
    async ({ specLocations, location }) => {
      vi.mocked(checklistRepo.verifyOccasionBelongsToTrip).mockResolvedValue(
        true,
      );
      vi.mocked(checklistRepo.verifyItemBelongsToTrip).mockResolvedValue(true);
      vi.mocked(checklistRepo.verifyTripSpecBelongsToItem).mockResolvedValue(
        true,
      );
      vi.mocked(checklistRepo.getSpecCheckLocations).mockResolvedValue(
        specLocations,
      );
      const { req, res } = createMockReqRes({
        params,
        body: { checked: true, location },
      });

      await setSpecCheck(req, res);

      expectJsonStatus(res, 400, {
        error: 'location is not a storage location of the checked unit',
      });
      expect(checklistRepo.setSpecCheck).not.toHaveBeenCalled();
    },
  );
});

describe('unexpected repository errors', () => {
  const tests: RejectCase[] = [
    {
      name: 'setSpecCheck',
      handler: setSpecCheck,
      req: {
        params: { tripId: '1', occId: '2', itemId: '3', specId: '4' },
        body: { checked: true, location: '託運' },
      },
      arrange: error =>
        vi
          .mocked(checklistRepo.verifyOccasionBelongsToTrip)
          .mockRejectedValue(error),
    },
    {
      name: 'addTripItemSpec',
      handler: addTripItemSpec,
      req: {
        params: { tripId: '1', itemId: '2' },
        body: { name: 'Type-C charger' },
      },
      arrange: error =>
        vi
          .mocked(checklistRepo.verifyItemBelongsToTrip)
          .mockRejectedValue(error),
    },
    {
      name: 'updateTripItemSpec',
      handler: updateTripItemSpec,
      req: {
        params: { tripId: '1', itemId: '2', specId: '3' },
        body: { name: 'Type-C charger' },
      },
      arrange: error =>
        vi
          .mocked(checklistRepo.verifyItemBelongsToTrip)
          .mockRejectedValue(error),
    },
    {
      name: 'deleteTripItemSpec',
      handler: deleteTripItemSpec,
      req: { params: { tripId: '1', itemId: '2', specId: '3' } },
      arrange: error =>
        vi
          .mocked(checklistRepo.verifyItemBelongsToTrip)
          .mockRejectedValue(error),
    },
  ];

  itRejects(tests);
});
