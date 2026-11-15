import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api, ApiError } from './client';
import { fetchPageTitle } from './pageTitle';

vi.mock('./client');

beforeEach(() => {
  vi.mocked(api).mockResolvedValue(undefined);
});

describe('fetchPageTitle', () => {
  it.each([
    { description: 'a found title', body: { title: 'Page' }, expected: 'Page' },
    { description: 'a missing title', body: { title: null }, expected: null },
  ])('resolves with $expected for $description', async ({ body, expected }) => {
    vi.mocked(api).mockResolvedValue(body);
    const signal = new AbortController().signal;

    const result = await fetchPageTitle('https://a.example.com/x?y=1', signal);

    expect(result).toBe(expected);
    expect(api).toHaveBeenCalledWith(
      `/api/fetch-title?url=${encodeURIComponent('https://a.example.com/x?y=1')}`,
      { signal },
    );
  });

  it('propagates the ApiError when the backend rejects the URL', async () => {
    vi.mocked(api).mockRejectedValue(new ApiError('bad', undefined, 400));

    await expect(fetchPageTitle('not a url')).rejects.toBeInstanceOf(ApiError);
  });
});
