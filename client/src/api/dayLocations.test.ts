import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api, json } from './client';
import {
  addDayLocation,
  deleteDayLocation,
  updateDayLocation,
} from './dayLocations';

vi.mock('./client', async importOriginal => {
  const actual = await importOriginal<typeof import('./client')>();
  return { ...actual, api: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api).mockResolvedValue(undefined);
});

describe('dayLocations API', () => {
  it.each([
    {
      description: 'addDayLocation POSTs to the day-scoped endpoint',
      call: () => addDayLocation(1, 10, 'Airport'),
      expectedUrl: '/api/trips/1/days/10/locations',
      expectedInit: { method: 'POST', ...json({ name: 'Airport' }) },
    },
    {
      description: 'updateDayLocation PUTs to the location endpoint',
      call: () => updateDayLocation(1, 5, 'Renamed'),
      expectedUrl: '/api/trips/1/locations/5',
      expectedInit: { method: 'PUT', ...json({ name: 'Renamed' }) },
    },
    {
      description: 'deleteDayLocation DELETEs the location endpoint',
      call: () => deleteDayLocation(1, 5),
      expectedUrl: '/api/trips/1/locations/5',
      expectedInit: { method: 'DELETE' },
    },
  ])('$description', async ({ call, expectedUrl, expectedInit }) => {
    await call();

    expect(api).toHaveBeenCalledWith(expectedUrl, expectedInit);
  });
});
