import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addAttraction,
  deleteAttraction,
  duplicateAttraction,
  reorderAttractions,
  updateAttraction,
} from './attractions';
import { api, json } from './client';

vi.mock('./client', async importOriginal => {
  const actual = await importOriginal<typeof import('./client')>();
  return { ...actual, api: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api).mockResolvedValue(undefined);
});

// The individual CRUD payload branches (?? undefined vs ?? null) already
// live in useAttractionActions.test.ts — this file only samples that each
// exported function builds the correct request against the `api` boundary.
describe('attractions API', () => {
  it.each([
    {
      description: 'addAttraction POSTs to the day-scoped endpoint',
      call: () => addAttraction(1, 10, { name: 'Spot' }),
      expectedUrl: '/api/trips/1/days/10/attractions',
      expectedInit: { method: 'POST', ...json({ name: 'Spot' }) },
    },
    {
      description: 'updateAttraction PUTs to the attraction endpoint',
      call: () =>
        updateAttraction(1, 5, { name: 'Renamed', googleMapUrl: null }),
      expectedUrl: '/api/trips/1/attractions/5',
      expectedInit: {
        method: 'PUT',
        ...json({ name: 'Renamed', googleMapUrl: null }),
      },
    },
    {
      description: 'deleteAttraction DELETEs the attraction endpoint',
      call: () => deleteAttraction(1, 5),
      expectedUrl: '/api/trips/1/attractions/5',
      expectedInit: { method: 'DELETE' },
    },
    {
      description: 'duplicateAttraction POSTs to the duplicate endpoint',
      call: () => duplicateAttraction(1, 5),
      expectedUrl: '/api/trips/1/attractions/5/duplicate',
      expectedInit: { method: 'POST' },
    },
    {
      description: 'reorderAttractions PATCHes the order endpoint',
      call: () => reorderAttractions(1, 10, [3, 1, 2]),
      expectedUrl: '/api/trips/1/days/10/attractions/order',
      expectedInit: {
        method: 'PATCH',
        ...json({ orderedIds: [3, 1, 2] }),
      },
    },
  ])('$description', async ({ call, expectedUrl, expectedInit }) => {
    await call();

    expect(api).toHaveBeenCalledWith(expectedUrl, expectedInit);
  });
});
