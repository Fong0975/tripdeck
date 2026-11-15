import { beforeEach, describe, expect, it, vi } from 'vitest';

import pkg from '../../package.json';
import { createMockReqRes, expectJsonStatus } from '../test-utils/httpMocks';
import { UnsafeUrlError } from '../utils/safeFetch';

import { fetchPageTitle, getHealth, getInfo } from './appController';

const mocks = vi.hoisted(() => ({ fetchHtml: vi.fn() }));

vi.mock('../utils/safeFetch', async importOriginal => ({
  ...(await importOriginal<typeof import('../utils/safeFetch')>()),
  fetchHtml: mocks.fetchHtml,
}));

describe('appController', () => {
  describe('fetchPageTitle', () => {
    beforeEach(() => {
      mocks.fetchHtml.mockReset();
    });

    it.each([
      {
        name: 'missing url parameter',
        query: {},
        expectedBody: { error: 'Missing url parameter' },
      },
      {
        name: 'unparseable url',
        query: { url: 'not a url' },
        expectedBody: { error: 'Invalid URL' },
      },
      {
        name: 'non-http(s) protocol',
        query: { url: 'ftp://example.com/file' },
        expectedBody: { error: 'Only http/https URLs are allowed' },
      },
    ])('returns 400 when $name', async ({ query, expectedBody }) => {
      const { req, res } = createMockReqRes({ query });

      await fetchPageTitle(req, res);

      expectJsonStatus(res, 400, expectedBody);
      expect(mocks.fetchHtml).not.toHaveBeenCalled();
    });

    it.each([
      {
        name: 'the title from the fetched HTML',
        html: '<html><head><title>Some Page</title></head></html>',
        expectedTitle: 'Some Page',
      },
      {
        name: 'a title tag with attributes',
        html: '<title data-x="1">Attr Page</title>',
        expectedTitle: 'Attr Page',
      },
      {
        name: 'a null title when the HTML has no title tag',
        html: '<html><head></head></html>',
        expectedTitle: null,
      },
    ])(
      'responds with $name without a status call',
      async ({ html, expectedTitle }) => {
        const { req, res } = createMockReqRes({
          query: { url: 'https://example.com' },
        });
        mocks.fetchHtml.mockResolvedValue(html);

        await fetchPageTitle(req, res);

        expect(mocks.fetchHtml).toHaveBeenCalledWith('https://example.com', {
          headers: expect.objectContaining({
            Accept: 'text/html,application/xhtml+xml',
          }),
        });
        expect(res.json).toHaveBeenCalledWith({ title: expectedTitle });
        expect(res.status).not.toHaveBeenCalled();
      },
    );

    it.each([
      {
        name: 'a network error',
        error: new Error('network error'),
      },
      {
        name: 'a non-HTML response',
        error: new Error('Unsupported content type: application/json'),
      },
      {
        name: 'too many redirects',
        error: new Error('Exceeded the limit of 5 redirects'),
      },
    ])('returns a null title without throwing on $name', async ({ error }) => {
      const { req, res } = createMockReqRes({
        query: { url: 'https://example.com' },
      });
      mocks.fetchHtml.mockRejectedValue(error);

      await expect(fetchPageTitle(req, res)).resolves.toBeUndefined();

      expect(res.json).toHaveBeenCalledWith({ title: null });
      expect(res.status).not.toHaveBeenCalled();
    });

    it.each([
      { name: 'a private target', url: 'http://192.168.1.1/' },
      { name: 'a cloud metadata target', url: 'http://169.254.169.254/' },
      { name: 'a redirect to a loopback target', url: 'https://example.com' },
    ])('returns 400 URL not allowed for $name', async ({ url }) => {
      const { req, res } = createMockReqRes({ query: { url } });
      mocks.fetchHtml.mockRejectedValue(
        new UnsafeUrlError('Host is not publicly routable'),
      );

      await fetchPageTitle(req, res);

      expectJsonStatus(res, 400, { error: 'URL not allowed' });
    });
  });

  describe('getHealth', () => {
    it('responds with status ok and a valid ISO timestamp', () => {
      const { req, res } = createMockReqRes();

      getHealth(req, res);

      expect(res.json).toHaveBeenCalledTimes(1);
      const body = vi.mocked(res.json).mock.calls[0][0] as {
        status: string;
        timestamp: string;
      };
      expect(body.status).toBe('ok');
      expect(typeof body.timestamp).toBe('string');
      expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
    });
  });

  describe('getInfo', () => {
    it('responds with the application name and version from package.json', () => {
      const { req, res } = createMockReqRes();

      getInfo(req, res);

      expect(res.json).toHaveBeenCalledWith({
        name: pkg.name,
        version: pkg.version,
      });
    });
  });
});
