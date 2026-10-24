import { afterEach, describe, expect, it, vi } from 'vitest';

import { getMapsConfig, MapsQuotaError } from './maps';

const fetchMock = vi.fn();

function stubFetch(response: Response) {
  fetchMock.mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getMapsConfig', () => {
  it('returns the browser key from the config endpoint', async () => {
    stubFetch(new Response(JSON.stringify({ apiKey: 'browser-key' })));

    await expect(getMapsConfig()).resolves.toEqual({ apiKey: 'browser-key' });

    expect(fetchMock).toHaveBeenCalledWith('/api/maps/config');
  });

  it.each([
    {
      description: 'carries the reset time from the response body',
      body: JSON.stringify({ error: 'Daily map quota reached', resetAt: 'T' }),
      expectedResetAt: 'T',
    },
    {
      description: 'falls back to null when the body has no reset time',
      body: JSON.stringify({ error: 'Daily map quota reached' }),
      expectedResetAt: null,
    },
    {
      description: 'falls back to null when the body is not JSON',
      body: 'Too Many Requests',
      expectedResetAt: null,
    },
  ])(
    'throws a MapsQuotaError on 429 that $description',
    async ({ body, expectedResetAt }) => {
      stubFetch(new Response(body, { status: 429 }));

      const failure = getMapsConfig();

      await expect(failure).rejects.toBeInstanceOf(MapsQuotaError);
      await expect(failure).rejects.toMatchObject({ resetAt: expectedResetAt });
    },
  );

  it.each([404, 500])('throws a plain error for HTTP %i', async status => {
    stubFetch(new Response(null, { status }));

    const failure = getMapsConfig();

    await expect(failure).rejects.toThrow(
      `API error ${status}: /api/maps/config`,
    );
    await expect(failure).rejects.not.toBeInstanceOf(MapsQuotaError);
  });
});
