import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, apiBlob, ApiError, apiJson, json } from './client';

function makeResponse(
  ok: boolean,
  status: number,
  body?: unknown,
  extra?: Partial<Response>,
): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    ...extra,
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

describe('apiBlob', () => {
  it('resolves with the response blob on success', async () => {
    const blob = new Blob(['zip-bytes']);
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(true, 200, undefined, { blob: () => Promise.resolve(blob) }),
    );

    await expect(apiBlob('/api/trips/export')).resolves.toBe(blob);
  });

  it('forwards the request path and init options to fetch', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(true, 200, undefined, {
        blob: () => Promise.resolve(new Blob()),
      }),
    );

    await apiBlob('/api/trips/export', { method: 'POST' });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/trips/export'),
      { method: 'POST' },
    );
  });

  it('throws the server-provided error message when the response has a JSON error body', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(false, 400, { error: 'tripIds must be a non-empty array' }),
    );

    await expect(apiBlob('/api/trips/export')).rejects.toThrow(
      'tripIds must be a non-empty array',
    );
  });

  it('falls back to a generic message when the error response is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(false, 500, undefined, {
        json: () => Promise.reject(new Error('not JSON')),
      }),
    );

    await expect(apiBlob('/api/trips/export')).rejects.toThrow(
      'API error 500: /api/trips/export',
    );
  });
});

describe('apiJson', () => {
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

      expect(await apiJson('/api/trips/import')).toEqual(expected);
    },
  );

  it('forwards the request path and init options to fetch', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(true, 200, {}));

    await apiJson('/api/trips/import', { method: 'POST' });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/trips/import'),
      { method: 'POST' },
    );
  });

  it('throws an ApiError carrying the message and details from a JSON error body', async () => {
    const details = {
      trips: [{ folder: 'trip_1', missingFilenames: ['a.jpg'] }],
    };
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(false, 400, {
        error: 'Backup file is incomplete',
        details,
      }),
    );

    const promise = apiJson('/api/trips/import');
    await expect(promise).rejects.toThrow('Backup file is incomplete');
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await promise.catch((err: ApiError) => {
      expect(err.details).toEqual(details);
    });
  });

  it('falls back to a generic message with no details when the error response is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(false, 500, undefined, {
        json: () => Promise.reject(new Error('not JSON')),
      }),
    );

    const promise = apiJson('/api/trips/import');
    await expect(promise).rejects.toThrow('API error 500: /api/trips/import');
    await promise.catch((err: ApiError) => {
      expect(err.details).toBeUndefined();
    });
  });
});
