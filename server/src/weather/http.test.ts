import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchJson } from './http';

const REQUEST_URL = 'https://api.example.com/data?key=secret';

function makeResponse(ok: boolean, status: number, body: unknown): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchJson', () => {
  const tests = [
    {
      name: 'resolves with the parsed body on a 2xx response',
      response: makeResponse(true, 200, { list: [1, 2] }),
      expected: { ok: true, data: { list: [1, 2] } },
    },
    {
      name: 'resolves with the status on a 404 response',
      response: makeResponse(false, 404, {}),
      expected: { ok: false, status: 404 },
    },
    {
      name: 'resolves with the status on a 500 response',
      response: makeResponse(false, 500, {}),
      expected: { ok: false, status: 500 },
    },
  ];

  it.each(tests)('$name', async ({ response, expected }) => {
    vi.mocked(fetch).mockResolvedValue(response);

    const result = await fetchJson(REQUEST_URL, { timeoutMs: 1000 });

    expect(result).toEqual(expected);
  });

  it('requests the URL with a timeout signal', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse(true, 200, {}));

    await fetchJson(REQUEST_URL, { timeoutMs: 1000 });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(REQUEST_URL);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    {
      name: 'the request fails',
      arrange: (error: Error) => vi.mocked(fetch).mockRejectedValue(error),
    },
    {
      name: 'the body is not valid JSON',
      arrange: (error: Error) =>
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.reject(error),
        } as Response),
    },
  ])('rejects when $name', async ({ arrange }) => {
    const error = new Error('boom');
    arrange(error);

    await expect(fetchJson(REQUEST_URL, { timeoutMs: 1000 })).rejects.toBe(
      error,
    );
  });
});
