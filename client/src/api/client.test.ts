import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, json } from './client';

function makeResponse(ok: boolean, status: number, body?: unknown): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api', () => {
  it('throws an error naming the status and url when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(false, 404));

    await expect(api('/api/trips/1')).rejects.toThrow(
      'API error 404: /api/trips/1',
    );
  });

  it.each([
    {
      description: 'a 204 No Content response',
      status: 204,
      body: { ignored: true },
      expected: undefined,
    },
    {
      description: 'a normal 2xx response',
      status: 200,
      body: { id: 1 },
      expected: { id: 1 },
    },
  ])(
    'resolves with $expected for $description',
    async ({ status, body, expected }) => {
      vi.mocked(fetch).mockResolvedValue(makeResponse(true, status, body));

      expect(await api('/api/trips/1')).toEqual(expected);
    },
  );

  it('forwards the request path and init options to fetch', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(true, 200, {}));

    await api('/api/trips/1', { method: 'DELETE' });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/trips/1'),
      { method: 'DELETE' },
    );
  });
});

describe('json', () => {
  it('serializes the body and sets the JSON content-type header', () => {
    expect(json({ name: 'Trip' })).toEqual({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Trip' }),
    });
  });
});
