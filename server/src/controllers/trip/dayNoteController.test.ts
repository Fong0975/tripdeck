import { describe, expect, it, vi } from 'vitest';

vi.mock('../../repositories/trip', () => ({
  findDayByIdAndTripId: vi.fn(),
  updateDayNotes: vi.fn(),
}));

import * as tripRepo from '../../repositories/trip';
import { createMockReqRes, expectJsonStatus } from '../../test-utils/httpMocks';

import { updateDayNotes } from './dayNoteController';

const sampleDay = { id: 10, day: 1, date: '2024-05-10' };

describe('updateDayNotes', () => {
  it('returns 404 when the day is not found', async () => {
    vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(null);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', dayId: '10' },
      body: { notes: 'New notes' },
    });

    await updateDayNotes(req, res);

    expectJsonStatus(res, 404, { error: 'Day not found' });
    expect(tripRepo.updateDayNotes).not.toHaveBeenCalled();
  });

  it('updates the notes and responds with the trimmed value', async () => {
    vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(sampleDay);
    vi.mocked(tripRepo.updateDayNotes).mockResolvedValue(true);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', dayId: '10' },
      body: { notes: '  New notes  ' },
    });

    await updateDayNotes(req, res);

    expect(tripRepo.updateDayNotes).toHaveBeenCalledWith(10, 'New notes');
    expect(res.json).toHaveBeenCalledWith({ id: 10, notes: 'New notes' });
  });

  it.each([
    { name: 'notes is missing', body: {} },
    { name: 'notes is blank', body: { notes: '   ' } },
    { name: 'notes is null', body: { notes: null } },
  ])('stores null when $name', async ({ body }) => {
    vi.mocked(tripRepo.findDayByIdAndTripId).mockResolvedValue(sampleDay);
    vi.mocked(tripRepo.updateDayNotes).mockResolvedValue(true);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', dayId: '10' },
      body,
    });

    await updateDayNotes(req, res);

    expect(tripRepo.updateDayNotes).toHaveBeenCalledWith(10, null);
    expect(res.json).toHaveBeenCalledWith({ id: 10, notes: null });
  });

  it.each([
    { name: 'a number', notes: 42 },
    { name: 'an array', notes: ['a', 'b'] },
    { name: 'an object', notes: { text: 'a' } },
  ])('returns 400 when notes is $name', async ({ notes }) => {
    const { req, res } = createMockReqRes({
      params: { tripId: '1', dayId: '10' },
      body: { notes },
    });

    await updateDayNotes(req, res);

    expectJsonStatus(res, 400, { error: 'notes must be a string' });
    expect(tripRepo.findDayByIdAndTripId).not.toHaveBeenCalled();
    expect(tripRepo.updateDayNotes).not.toHaveBeenCalled();
  });

  it('rejects with the underlying error for the error handler', async () => {
    const error = new Error('db error');
    vi.mocked(tripRepo.findDayByIdAndTripId).mockRejectedValue(error);
    const { req, res } = createMockReqRes({
      params: { tripId: '1', dayId: '10' },
      body: { notes: 'New notes' },
    });

    await expect(updateDayNotes(req, res)).rejects.toBe(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
