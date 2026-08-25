import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api, json } from './client';
import { updateDayNotes } from './dayNotes';

vi.mock('./client', async importOriginal => {
  const actual = await importOriginal<typeof import('./client')>();
  return { ...actual, api: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api).mockResolvedValue(undefined);
});

describe('updateDayNotes', () => {
  it('PUTs the notes to the day-scoped endpoint', async () => {
    await updateDayNotes(1, 10, 'New notes');

    expect(api).toHaveBeenCalledWith('/api/trips/1/days/10/notes', {
      method: 'PUT',
      ...json({ notes: 'New notes' }),
    });
  });

  it('PUTs null to clear the notes', async () => {
    await updateDayNotes(1, 10, null);

    expect(api).toHaveBeenCalledWith('/api/trips/1/days/10/notes', {
      method: 'PUT',
      ...json({ notes: null }),
    });
  });
});
