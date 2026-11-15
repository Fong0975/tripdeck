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
  addOccasion,
  deleteOccasion,
  updateOccasion,
} from './tripOccasionController';

vi.mock('../../repositories/checklist/trip', () => ({
  createOccasion: vi.fn(),
  deleteOccasionIfNotLast: vi.fn(),
  tripExists: vi.fn(),
  updateOccasion: vi.fn(),
  verifyOccasionBelongsToTrip: vi.fn(),
}));

const blankNameCases = [
  ...invalidNameCases,
  { label: 'name is whitespace only', body: { name: '   ' } },
];

beforeEach(() => {
  vi.mocked(checklistRepo.tripExists).mockResolvedValue(true);
});

describe('addOccasion', () => {
  it.each(blankNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({ params: { tripId: '1' }, body });

    await addOccasion(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(checklistRepo.createOccasion).not.toHaveBeenCalled();
  });

  it('returns 201 with the created occasion', async () => {
    const occasion = { id: 2, name: 'Return trip', checks: {} };
    vi.mocked(checklistRepo.createOccasion).mockResolvedValue(occasion);
    const { req, res } = createMockReqRes({
      params: { tripId: '1' },
      body: { name: 'Return trip' },
    });

    await addOccasion(req, res);

    expect(checklistRepo.tripExists).toHaveBeenCalledWith(1);
    expect(checklistRepo.createOccasion).toHaveBeenCalledWith(1, 'Return trip');
    expectJsonStatus(res, 201, occasion);
  });

  it('returns 404 when the trip does not exist', async () => {
    vi.mocked(checklistRepo.tripExists).mockResolvedValue(false);
    const { req, res } = createMockReqRes({
      params: { tripId: '1' },
      body: { name: 'Return trip' },
    });

    await addOccasion(req, res);

    expectJsonStatus(res, 404, { error: 'Trip not found' });
    expect(checklistRepo.createOccasion).not.toHaveBeenCalled();
  });
});

describe('updateOccasion', () => {
  it.each(blankNameCases)('returns 400 when $label', async ({ body }) => {
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2' },
      body,
    });

    await updateOccasion(req, res);

    expectJsonStatus(res, 400, { error: 'name is required' });
    expect(checklistRepo.verifyOccasionBelongsToTrip).not.toHaveBeenCalled();
  });

  it('returns 404 when the occasion does not belong to the trip', async () => {
    vi.mocked(checklistRepo.verifyOccasionBelongsToTrip).mockResolvedValue(
      false,
    );
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2' },
      body: { name: 'Departure' },
    });

    await updateOccasion(req, res);

    expectJsonStatus(res, 404, { error: 'Occasion not found' });
    expect(checklistRepo.updateOccasion).not.toHaveBeenCalled();
  });

  it('returns 404 when the update resolves null', async () => {
    vi.mocked(checklistRepo.verifyOccasionBelongsToTrip).mockResolvedValue(
      true,
    );
    vi.mocked(checklistRepo.updateOccasion).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2' },
      body: { name: 'Departure' },
    });

    await updateOccasion(req, res);

    expectJsonStatus(res, 404, { error: 'Occasion not found' });
  });

  it('returns 200 with the updated occasion', async () => {
    const occasion = { id: 2, name: 'Departure', checks: {} };
    vi.mocked(checklistRepo.verifyOccasionBelongsToTrip).mockResolvedValue(
      true,
    );
    vi.mocked(checklistRepo.updateOccasion).mockResolvedValue(occasion);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', occId: '2' },
      body: { name: 'Departure' },
    });

    await updateOccasion(req, res);

    expect(res.json).toHaveBeenCalledWith(occasion);
  });
});

describe('deleteOccasion', () => {
  it.each([
    {
      result: 'deleted' as const,
      expectStatus: 204,
      expectBody: undefined,
    },
    {
      result: 'not_found' as const,
      expectStatus: 404,
      expectBody: { error: 'Occasion not found' },
    },
    {
      result: 'last_occasion' as const,
      expectStatus: 409,
      expectBody: { error: 'Cannot delete the last occasion' },
    },
  ])(
    'responds $expectStatus when the repository returns $result',
    async ({ result, expectStatus, expectBody }) => {
      vi.mocked(checklistRepo.deleteOccasionIfNotLast).mockResolvedValue(
        result,
      );
      const { req, res } = createMockReqRes({
        params: { tripId: '1', occId: '2' },
      });

      await deleteOccasion(req, res);

      expect(checklistRepo.deleteOccasionIfNotLast).toHaveBeenCalledWith(1, 2);
      expect(res.status).toHaveBeenCalledWith(expectStatus);
      if (expectBody) {
        expect(res.json).toHaveBeenCalledWith(expectBody);
      } else {
        expect(res.send).toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
      }
    },
  );
});

describe('unexpected repository errors', () => {
  const tests: RejectCase[] = [
    {
      name: 'addOccasion',
      handler: addOccasion,
      req: { params: { tripId: '1' }, body: { name: 'Departure' } },
      arrange: error =>
        vi.mocked(checklistRepo.createOccasion).mockRejectedValue(error),
    },
    {
      name: 'updateOccasion',
      handler: updateOccasion,
      req: { params: { tripId: '1', occId: '2' }, body: { name: 'Departure' } },
      arrange: error =>
        vi
          .mocked(checklistRepo.verifyOccasionBelongsToTrip)
          .mockRejectedValue(error),
    },
    {
      name: 'deleteOccasion',
      handler: deleteOccasion,
      req: { params: { tripId: '1', occId: '2' } },
      arrange: error =>
        vi
          .mocked(checklistRepo.deleteOccasionIfNotLast)
          .mockRejectedValue(error),
    },
  ];

  itRejects(tests);
});
