import { describe, expect, it, vi } from 'vitest';

import * as tripRepo from '../../repositories/checklist/trip';
import {
  createMockReqRes,
  expectJsonStatus,
  type MockReqOverrides,
} from '../../test-utils/httpMocks';

import { getTripChecklist } from './tripChecklistController';

vi.mock('../../repositories/checklist/trip', () => ({
  findOrInitChecklist: vi.fn(),
}));

describe('getTripChecklist', () => {
  it('returns 200 with the trip checklist', async () => {
    const checklist = { tripId: 5, categories: [], occasions: [] };
    vi.mocked(tripRepo.findOrInitChecklist).mockResolvedValue(checklist);
    const { req, res } = createMockReqRes({ params: { tripId: '5' } });

    await getTripChecklist(req, res);

    expect(tripRepo.findOrInitChecklist).toHaveBeenCalledWith(5);
    expect(res.json).toHaveBeenCalledWith(checklist);
  });

  it('returns 404 when the trip does not exist', async () => {
    vi.mocked(tripRepo.findOrInitChecklist).mockResolvedValue(null);
    const { req, res } = createMockReqRes({ params: { tripId: '5' } });

    await getTripChecklist(req, res);

    expectJsonStatus(res, 404, { error: 'Trip not found' });
  });
});

describe('unexpected repository errors', () => {
  const tests: Array<{
    name: string;
    handler: typeof getTripChecklist;
    req: MockReqOverrides;
    arrange: (error: Error) => void;
  }> = [
    {
      name: 'getTripChecklist',
      handler: getTripChecklist,
      req: { params: { tripId: '1' } },
      arrange: error =>
        vi.mocked(tripRepo.findOrInitChecklist).mockRejectedValue(error),
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
