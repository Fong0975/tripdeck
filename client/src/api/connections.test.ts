import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api, json } from './client';
import {
  addConnection,
  deleteConnection,
  updateConnection,
} from './connections';

vi.mock('./client', async importOriginal => {
  const actual = await importOriginal<typeof import('./client')>();
  return { ...actual, api: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api).mockResolvedValue(undefined);
});

describe('connections API', () => {
  it.each([
    {
      description: 'addConnection POSTs to the day-scoped endpoint',
      call: () =>
        addConnection(1, 10, {
          fromAttractionId: 100,
          toAttractionId: 200,
          transportMode: 'transit',
        }),
      expectedUrl: '/api/trips/1/days/10/connections',
      expectedInit: {
        method: 'POST',
        ...json({
          fromAttractionId: 100,
          toAttractionId: 200,
          transportMode: 'transit',
        }),
      },
    },
    {
      description: 'updateConnection PUTs to the connection endpoint',
      call: () => updateConnection(1, 7, { transportMode: 'walk' }),
      expectedUrl: '/api/trips/1/connections/7',
      expectedInit: {
        method: 'PUT',
        ...json({ transportMode: 'walk' }),
      },
    },
    {
      description: 'deleteConnection DELETEs the connection endpoint',
      call: () => deleteConnection(1, 7),
      expectedUrl: '/api/trips/1/connections/7',
      expectedInit: { method: 'DELETE' },
    },
  ])('$description', async ({ call, expectedUrl, expectedInit }) => {
    await call();

    expect(api).toHaveBeenCalledWith(expectedUrl, expectedInit);
  });
});
