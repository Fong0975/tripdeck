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
  findOrInitChecklist: vi.fn(),
}));

describe('getTripChecklist', () => {
  it('returns 200 with the trip checklist', async () => {
    const checklist = { tripId: 5, categories: [], occasions: [] };
    vi.mocked(checklistRepo.findOrInitChecklist).mockResolvedValue(checklist);
    const { req, res } = createMockReqRes({ params: { tripId: '5' } });

    await getTripChecklist(req, res);

    expect(checklistRepo.findOrInitChecklist).toHaveBeenCalledWith(5);
    expect(res.json).toHaveBeenCalledWith(checklist);
  });

  it('returns 404 when the trip does not exist', async () => {
    vi.mocked(checklistRepo.findOrInitChecklist).mockResolvedValue(null);
    const { req, res } = createMockReqRes({ params: { tripId: '5' } });

    await getTripChecklist(req, res);

    expectJsonStatus(res, 404, { error: 'Trip not found' });
  });
});

describe('unexpected repository errors', () => {
  const tests: RejectCase[] = [
    {
      name: 'getTripChecklist',
      handler: getTripChecklist,
      req: { params: { tripId: '1' } },
      arrange: error =>
        vi.mocked(checklistRepo.findOrInitChecklist).mockRejectedValue(error),
    },
  ];

  itRejects(tests);
});
