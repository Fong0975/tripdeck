import { describe, expect, it, vi } from 'vitest';

import {
  fetchHtml,
  type LookupFn,
  readCappedText,
  UnsafeUrlError,
} from './safeFetch';

type ResponseFactory = () => Response;

const DNS: Record<string, string[]> = {
  'example.com': ['93.184.216.34'],
  'next.example.com': ['93.184.216.35'],
  'internal.example.com': ['10.0.0.5'],
  'mixed.example.com': ['93.184.216.34', '127.0.0.1'],
  'empty.example.com': [],
};

const html =
  (body: string, contentType = 'text/html; charset=utf-8'): ResponseFactory =>
  () =>
    new Response(body, {
      status: 200,
      headers: { 'content-type': contentType },
    });

const redirect =
  (location: string, status = 302): ResponseFactory =>
  () =>
    new Response(null, { status, headers: { location } });

/** Builds a fetch mock that returns the given responses in call order. */
function mockFetch(responses: ResponseFactory[]) {
  const fetchFn = vi.fn<typeof fetch>();
  for (const factory of responses) {
    fetchFn.mockImplementationOnce(async () => factory());
  }
  return fetchFn;
}

const lookupFn: LookupFn = async hostname => {
  const addresses = DNS[hostname];
  if (!addresses) {
    throw new Error(`ENOTFOUND ${hostname}`);
  }
  return addresses;
};

/** Builds a response whose body streams the given chunk sizes and records cancellation. */
function streamingResponse(chunkSizes: number[], headers?: HeadersInit) {
  const state = { pulled: 0, cancelled: false };
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (state.pulled >= chunkSizes.length) {
        controller.close();
        return;
      }
      controller.enqueue(new Uint8Array(chunkSizes[state.pulled]).fill(0x61));
      state.pulled++;
    },
    cancel() {
      state.cancelled = true;
    },
  });
  return { response: new Response(body, { headers }), state };
}

describe('fetchHtml', () => {
  const resolveTests: {
    name: string;
    url: string;
    responses: ResponseFactory[];
    expectedBody: string;
    expectedUrls: string[];
  }[] = [
    {
      name: 'plain HTML page',
      url: 'https://example.com/',
      responses: [html('<title>A</title>')],
      expectedBody: '<title>A</title>',
      expectedUrls: ['https://example.com/'],
    },
    {
      name: 'XHTML page',
      url: 'https://example.com/',
      responses: [html('<title>X</title>', 'application/xhtml+xml')],
      expectedBody: '<title>X</title>',
      expectedUrls: ['https://example.com/'],
    },
    {
      name: 'public IP literal host',
      url: 'http://93.184.216.34/',
      responses: [html('ok')],
      expectedBody: 'ok',
      expectedUrls: ['http://93.184.216.34/'],
    },
    {
      name: 'relative redirect to a public host',
      url: 'https://example.com/a',
      responses: [redirect('/b', 301), html('b')],
      expectedBody: 'b',
      expectedUrls: ['https://example.com/a', 'https://example.com/b'],
    },
    {
      name: 'absolute redirect to another public host',
      url: 'https://example.com/',
      responses: [redirect('https://next.example.com/page'), html('next')],
      expectedBody: 'next',
      expectedUrls: ['https://example.com/', 'https://next.example.com/page'],
    },
    {
      name: 'exactly the maximum number of redirects',
      url: 'https://example.com/0',
      responses: [
        redirect('/1'),
        redirect('/2'),
        redirect('/3'),
        redirect('/4'),
        redirect('/5'),
        html('end'),
      ],
      expectedBody: 'end',
      expectedUrls: [0, 1, 2, 3, 4, 5].map(n => `https://example.com/${n}`),
    },
  ];

  it.each(resolveTests)(
    'resolves the body for $name',
    async ({ url, responses, expectedBody, expectedUrls }) => {
      const fetchFn = mockFetch(responses);

      await expect(fetchHtml(url, { fetchFn, lookupFn })).resolves.toBe(
        expectedBody,
      );

      expect(fetchFn.mock.calls.map(([target]) => target)).toEqual(
        expectedUrls,
      );
    },
  );

  const rejectTests: {
    name: string;
    url: string;
    responses: ResponseFactory[];
    expectedError: new (message: string) => Error;
    expectedMessage: RegExp;
    expectedFetchCalls: number;
  }[] = [
    {
      name: 'non-http(s) protocol',
      url: 'ftp://example.com/file',
      responses: [],
      expectedError: UnsafeUrlError,
      expectedMessage: /protocol/,
      expectedFetchCalls: 0,
    },
    {
      name: 'credentials in the URL',
      url: 'https://user:pass@example.com/',
      responses: [],
      expectedError: UnsafeUrlError,
      expectedMessage: /Credentials/,
      expectedFetchCalls: 0,
    },
    {
      name: 'loopback IPv4 literal',
      url: 'http://127.0.0.1:3000/',
      responses: [],
      expectedError: UnsafeUrlError,
      expectedMessage: /not publicly routable/,
      expectedFetchCalls: 0,
    },
    {
      name: 'loopback IPv6 literal in brackets',
      url: 'http://[::1]:8080/',
      responses: [],
      expectedError: UnsafeUrlError,
      expectedMessage: /not publicly routable/,
      expectedFetchCalls: 0,
    },
    {
      name: 'IPv4-mapped metadata address',
      url: 'http://[::ffff:169.254.169.254]/latest/meta-data',
      responses: [],
      expectedError: UnsafeUrlError,
      expectedMessage: /not publicly routable/,
      expectedFetchCalls: 0,
    },
    {
      name: 'hostname resolving to a private address',
      url: 'https://internal.example.com/',
      responses: [],
      expectedError: UnsafeUrlError,
      expectedMessage: /not publicly routable/,
      expectedFetchCalls: 0,
    },
    {
      name: 'hostname with any non-public resolved address',
      url: 'https://mixed.example.com/',
      responses: [],
      expectedError: UnsafeUrlError,
      expectedMessage: /not publicly routable/,
      expectedFetchCalls: 0,
    },
    {
      name: 'hostname resolving to no address',
      url: 'https://empty.example.com/',
      responses: [],
      expectedError: UnsafeUrlError,
      expectedMessage: /not publicly routable/,
      expectedFetchCalls: 0,
    },
    {
      name: 'redirect to a private IP literal',
      url: 'https://example.com/',
      responses: [redirect('http://169.254.169.254/latest/meta-data')],
      expectedError: UnsafeUrlError,
      expectedMessage: /not publicly routable/,
      expectedFetchCalls: 1,
    },
    {
      name: 'redirect to a hostname resolving to a private address',
      url: 'https://example.com/',
      responses: [
        redirect('https://next.example.com/'),
        redirect('http://internal.example.com/'),
      ],
      expectedError: UnsafeUrlError,
      expectedMessage: /not publicly routable/,
      expectedFetchCalls: 2,
    },
    {
      name: 'redirect to a non-http(s) protocol',
      url: 'https://example.com/',
      responses: [redirect('file:///etc/passwd')],
      expectedError: UnsafeUrlError,
      expectedMessage: /protocol/,
      expectedFetchCalls: 1,
    },
    {
      name: 'too many redirects',
      url: 'https://example.com/0',
      responses: [1, 2, 3, 4, 5, 6].map(n => redirect(`/${n}`)),
      expectedError: Error,
      expectedMessage: /Exceeded the limit of 5 redirects/,
      expectedFetchCalls: 6,
    },
    {
      name: 'non-HTML content type',
      url: 'https://example.com/data',
      responses: [html('{}', 'application/json')],
      expectedError: Error,
      expectedMessage: /Unsupported content type: application\/json/,
      expectedFetchCalls: 1,
    },
    {
      name: 'missing content type',
      url: 'https://example.com/',
      responses: [() => new Response(new Uint8Array([1, 2, 3]))],
      expectedError: Error,
      expectedMessage: /Unsupported content type/,
      expectedFetchCalls: 1,
    },
    {
      name: 'unresolvable hostname',
      url: 'https://unknown.example.com/',
      responses: [],
      expectedError: Error,
      expectedMessage: /ENOTFOUND/,
      expectedFetchCalls: 0,
    },
  ];

  it.each(rejectTests)(
    'rejects $name',
    async ({
      url,
      responses,
      expectedError,
      expectedMessage,
      expectedFetchCalls,
    }) => {
      const fetchFn = mockFetch(responses);

      const promise = fetchHtml(url, { fetchFn, lookupFn });

      await expect(promise).rejects.toBeInstanceOf(expectedError);
      await expect(promise).rejects.toThrow(expectedMessage);
      expect(fetchFn).toHaveBeenCalledTimes(expectedFetchCalls);
    },
  );

  it('requests with manual redirects, the given headers and an abort signal', async () => {
    const fetchFn = mockFetch([html('ok')]);
    const headers = { 'User-Agent': 'test-agent' };

    await fetchHtml('https://example.com/', { fetchFn, lookupFn, headers });

    expect(fetchFn).toHaveBeenCalledWith('https://example.com/', {
      method: 'GET',
      redirect: 'manual',
      signal: expect.any(AbortSignal),
      headers,
    });
  });

  it('caps the HTML body at maxBytes', async () => {
    const { response, state } = streamingResponse([1024, 1024, 1024], {
      'content-type': 'text/html',
    });
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response);

    const body = await fetchHtml('https://example.com/', {
      fetchFn,
      lookupFn,
      maxBytes: 1500,
    });

    expect(body).toHaveLength(1500);
    expect(state.cancelled).toBe(true);
  });
});

describe('readCappedText', () => {
  const tests: {
    name: string;
    chunkSizes: number[];
    maxBytes: number;
    expectedLength: number;
    expectedPulls: number;
  }[] = [
    {
      name: 'body smaller than the cap is read fully',
      chunkSizes: [10, 20],
      maxBytes: 100,
      expectedLength: 30,
      expectedPulls: 2,
    },
    {
      name: 'body equal to the cap is read fully',
      chunkSizes: [50, 50],
      maxBytes: 100,
      expectedLength: 100,
      expectedPulls: 2,
    },
    {
      name: 'cap falling inside a chunk truncates that chunk',
      chunkSizes: [60, 60, 60],
      maxBytes: 100,
      expectedLength: 100,
      expectedPulls: 2,
    },
    {
      name: 'default-sized cap stops before the remaining chunks',
      chunkSizes: [40 * 1024, 40 * 1024, 40 * 1024, 40 * 1024],
      maxBytes: 64 * 1024,
      expectedLength: 64 * 1024,
      expectedPulls: 2,
    },
    {
      name: 'empty body',
      chunkSizes: [],
      maxBytes: 100,
      expectedLength: 0,
      expectedPulls: 0,
    },
  ];

  it.each(tests)(
    '$name',
    async ({ chunkSizes, maxBytes, expectedLength, expectedPulls }) => {
      const { response, state } = streamingResponse(chunkSizes);

      const text = await readCappedText(response, maxBytes);

      expect(text).toHaveLength(expectedLength);
      expect(state.pulled).toBeLessThanOrEqual(expectedPulls + 1);
      expect(state.pulled).toBeGreaterThanOrEqual(expectedPulls);
    },
  );

  it('returns an empty string for a response without a body', async () => {
    await expect(readCappedText(new Response(null), 100)).resolves.toBe('');
  });
});
