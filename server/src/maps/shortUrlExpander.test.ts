import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../logger', async () => {
  const { mockLogger } = await import('../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import { mockLogger } from '../test-utils/loggerMock';

import { expandShortUrl, isShortLink } from './shortUrlExpander';

function redirectTo(location: string | null, status = 302): Response {
  return new Response(null, {
    status,
    headers: location === null ? {} : { location },
  });
}

describe('isShortLink', () => {
  it.each([
    { url: 'https://maps.app.goo.gl/abc', expected: true },
    { url: 'https://goo.gl/maps/abc', expected: true },
    { url: 'https://MAPS.APP.GOO.GL/x', expected: true },
    { url: 'https://www.google.com/maps/place/X', expected: false },
    { url: 'https://evil.example.com/maps.app.goo.gl', expected: false },
    { url: 'nonsense', expected: false },
  ])('returns $expected for $url', ({ url, expected }) => {
    expect(isShortLink(url)).toBe(expected);
  });
});

describe('expandShortUrl', () => {
  const fetchMock = vi.fn();
  const expand = (url: string) =>
    expandShortUrl(url, fetchMock as unknown as typeof fetch);

  beforeEach(() => {
    fetchMock.mockReset();
  });

  it.each([
    { description: 'a non-Google host', url: 'https://evil.example.com/x' },
    { description: 'a plain http short link', url: 'http://maps.app.goo.gl/x' },
    { description: 'an unparseable URL', url: 'not a url' },
    { description: 'a short link with a port', url: 'https://goo.gl:8443/x' },
  ])('refuses to start from $description without fetching', async ({ url }) => {
    await expect(expand(url)).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the Google Maps URL a short link redirects to without fetching it', async () => {
    const target = 'https://www.google.com/maps/place/X/@25.1,121.2,17z';
    fetchMock.mockResolvedValueOnce(redirectTo(target));

    await expect(expand('https://maps.app.goo.gl/abc')).resolves.toBe(target);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://maps.app.goo.gl/abc',
      expect.objectContaining({ method: 'GET', redirect: 'manual' }),
    );
  });

  it('follows a relative redirect between short link hosts', async () => {
    fetchMock
      .mockResolvedValueOnce(redirectTo('/maps/abc'))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(expand('https://goo.gl/xyz')).resolves.toBe(
      'https://goo.gl/maps/abc',
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    {
      description: 'a country Google Maps domain',
      location: 'https://www.google.com.tw/maps/place/X',
      blocked: false,
    },
    {
      description: 'a consent subdomain',
      location: 'https://consent.google.com/maps/x',
      blocked: true,
    },
    {
      description: 'a lookalike host',
      location: 'https://google.com.evil.com/maps/x',
      blocked: true,
    },
    {
      description: 'a Google port other than 443',
      location: 'https://www.google.com:8443/maps/x',
      blocked: true,
    },
    {
      description: 'a Google path outside /maps',
      location: 'https://www.google.com/search?q=1',
      blocked: true,
    },
    {
      description: 'embedded credentials',
      location: 'https://user:pw@www.google.com/maps/x',
      blocked: true,
    },
    {
      description: 'a plain http target',
      location: 'http://www.google.com/maps/x',
      blocked: true,
    },
    {
      description: 'an internal address',
      location: 'http://169.254.169.254/latest/meta-data',
      blocked: true,
    },
  ])('handles a redirect to $description', async ({ location, blocked }) => {
    fetchMock.mockResolvedValueOnce(redirectTo(location));

    const result = await expand('https://maps.app.goo.gl/abc');

    expect(result).toBe(new URL(location).toString());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledTimes(blocked ? 1 : 0);
  });

  it.each([
    {
      description: 'the response is not a redirect',
      response: () => new Response(null, { status: 200 }),
    },
    {
      description: 'a redirect has no location header',
      response: () => redirectTo(null),
    },
  ])('returns the current URL when $description', async ({ response }) => {
    fetchMock.mockResolvedValueOnce(response());

    await expect(expand('https://maps.app.goo.gl/abc')).resolves.toBe(
      'https://maps.app.goo.gl/abc',
    );
  });

  it('gives up after too many redirects', async () => {
    fetchMock.mockImplementation(async () =>
      redirectTo('https://maps.app.goo.gl/next'),
    );

    await expect(expand('https://maps.app.goo.gl/abc')).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });

  it('returns null and logs when the request fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(expand('https://maps.app.goo.gl/abc')).resolves.toBeNull();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Short link expansion request failed',
      expect.objectContaining({ error: 'network down' }),
    );
  });

  it('returns null when the location header is not a valid URL', async () => {
    fetchMock.mockResolvedValueOnce(redirectTo('http://['));

    await expect(expand('https://maps.app.goo.gl/abc')).resolves.toBeNull();
  });

  it('uses the global fetch by default', async () => {
    const globalFetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(expandShortUrl('https://goo.gl/abc')).resolves.toBe(
      'https://goo.gl/abc',
    );

    expect(globalFetch).toHaveBeenCalledTimes(1);
    globalFetch.mockRestore();
  });
});
