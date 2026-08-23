import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import pkg from '../../package.json';
import { createMockReqRes, expectJsonStatus } from '../test-utils/httpMocks';

import { fetchPageTitle, getHealth, getInfo } from './appController';

describe('appController', () => {
  describe('fetchPageTitle', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
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
      expect(fetch).not.toHaveBeenCalled();
    });

    it('resolves the title from the fetched HTML and calls res.json without a status call', async () => {
      const { req, res } = createMockReqRes({
        query: { url: 'https://example.com' },
      });
      vi.mocked(fetch).mockResolvedValue({
        text: () =>
          Promise.resolve('<html><head><title>Some Page</title></head></html>'),
      } as Response);

      await fetchPageTitle(req, res);

      expect(res.json).toHaveBeenCalledWith({ title: 'Some Page' });
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns a null title when the HTML has no title tag', async () => {
      const { req, res } = createMockReqRes({
        query: { url: 'https://example.com' },
      });
      vi.mocked(fetch).mockResolvedValue({
        text: () => Promise.resolve('<html><head></head></html>'),
      } as Response);

      await fetchPageTitle(req, res);

      expect(res.json).toHaveBeenCalledWith({ title: null });
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns a null title without throwing when fetch rejects', async () => {
      const { req, res } = createMockReqRes({
        query: { url: 'https://example.com' },
      });
      vi.mocked(fetch).mockRejectedValue(new Error('network error'));

      await expect(fetchPageTitle(req, res)).resolves.toBeUndefined();

      expect(res.json).toHaveBeenCalledWith({ title: null });
      expect(res.status).not.toHaveBeenCalled();
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
