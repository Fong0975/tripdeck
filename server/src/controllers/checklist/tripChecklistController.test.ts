import { describe, expect, it, vi } from 'vitest';

import * as checklistRepo from '../../repositories/checklist/trip';
import {
  createMockReqRes,
  expectJsonStatus,
  itRejects,
  type RejectCase,
} from '../../test-utils/httpMocks';

import { getTripChecklist } from './tripChecklistController';

vi.mock('../../repositories/checklist/trip', () => ({
  findChecklist: vi.fn(),
  tripExists: vi.fn(),
}));

describe('getTripChecklist', () => {
  it('returns 200 with the stored checklist without checking the trip', async () => {
    const checklist = {
      tripId: 5,
      categories: [],
      occasions: [{ id: 1, name: '收拾', checks: {}, specChecks: {} }],
    };
    vi.mocked(checklistRepo.findChecklist).mockResolvedValue(checklist);
    const { req, res } = createMockReqRes({ params: { tripId: '5' } });

    await getTripChecklist(req, res);

    expect(checklistRepo.findChecklist).toHaveBeenCalledWith(5);
    expect(checklistRepo.tripExists).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(checklist);
  });

  it.each([
    {
      label: 'returns an empty checklist without creating one',
      tripFound: true,
      assert: (res: ReturnType<typeof createMockReqRes>['res']) =>
        expect(res.json).toHaveBeenCalledWith({
          tripId: 5,
          categories: [],
          occasions: [],
        }),
    },
    {
      label: 'returns 404',
      tripFound: false,
      assert: (res: ReturnType<typeof createMockReqRes>['res']) =>
        expectJsonStatus(res, 404, { error: 'Trip not found' }),
    },
  ])(
    '$label when the trip has no checklist and tripFound=$tripFound',
    async ({ tripFound, assert }) => {
      vi.mocked(checklistRepo.findChecklist).mockResolvedValue(null);
      vi.mocked(checklistRepo.tripExists).mockResolvedValue(tripFound);
      const { req, res } = createMockReqRes({ params: { tripId: '5' } });

      await getTripChecklist(req, res);

      expect(checklistRepo.tripExists).toHaveBeenCalledWith(5);
      assert(res);
    },
  );
});

describe('unexpected repository errors', () => {
  const tests: RejectCase[] = [
    {
      name: 'getTripChecklist',
      handler: getTripChecklist,
      req: { params: { tripId: '1' } },
      arrange: error =>
        vi.mocked(checklistRepo.findChecklist).mockRejectedValue(error),
    },
  ];

  itRejects(tests);
});
