import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../logger', async () => {
  const { mockLogger } = await import('../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import {
  __resetLinkResolverForTests,
  resolveCoordinatesFromLink,
} from './linkResolver';

const SHORT = 'https://maps.app.goo.gl/VyKowvJG1v3hUtWJ9';
const EXPANDED = 'https://www.google.com/maps/place/X/@25.1,121.2,17z';

describe('resolveCoordinatesFromLink', () => {
  const expand = vi.fn();
  const resolve = (link: string | null | undefined) =>
    resolveCoordinatesFromLink(link, expand);

  beforeEach(() => {
    __resetLinkResolverForTests();
    expand.mockReset();
  });

  it.each([
    { description: 'null', link: null, expected: null },
    { description: 'undefined', link: undefined, expected: null },
    { description: 'blank', link: '   ', expected: null },
    {
      description: 'a full link carrying coordinates',
      link: 'https://www.google.com/maps/@25.1,121.2,17z',
      expected: { lat: 25.1, lng: 121.2 },
    },
    {
      description: 'a full link without coordinates',
      link: 'https://www.google.com/maps/place/X',
      expected: null,
    },
  ])('handles $description without expanding', async ({ link, expected }) => {
    await expect(resolve(link)).resolves.toEqual(expected);

    expect(expand).not.toHaveBeenCalled();
  });

  it('expands a short link and parses the result', async () => {
    expand.mockResolvedValueOnce(EXPANDED);

    await expect(resolve(`  ${SHORT}  `)).resolves.toEqual({
      lat: 25.1,
      lng: 121.2,
    });

    expect(expand).toHaveBeenCalledWith(SHORT);
  });

  it.each([
    {
      description: 'successful expansion',
      expanded: EXPANDED,
      expected: { lat: 25.1, lng: 121.2 },
    },
    {
      description: 'failed expansion',
      expanded: null,
      expected: null,
    },
    {
      description: 'expansion to a link without coordinates',
      expanded: 'https://www.google.com/maps/place/X',
      expected: null,
    },
  ])(
    'caches the $description so it is not repeated',
    async ({ expanded, expected }) => {
      expand.mockResolvedValue(expanded);

      await expect(resolve(SHORT)).resolves.toEqual(expected);
      await expect(resolve(SHORT)).resolves.toEqual(expected);

      expect(expand).toHaveBeenCalledTimes(1);
    },
  );

  it('shares one expansion between concurrent callers', async () => {
    expand.mockResolvedValue(EXPANDED);

    const results = await Promise.all([resolve(SHORT), resolve(SHORT)]);

    expect(results).toEqual([
      { lat: 25.1, lng: 121.2 },
      { lat: 25.1, lng: 121.2 },
    ]);
    expect(expand).toHaveBeenCalledTimes(1);
  });

  it('does not cache a thrown error', async () => {
    expand.mockRejectedValueOnce(new Error('boom'));
    expand.mockResolvedValueOnce(EXPANDED);

    await expect(resolve(SHORT)).rejects.toThrow('boom');
    await expect(resolve(SHORT)).resolves.toEqual({ lat: 25.1, lng: 121.2 });
  });

  it('uses the real expander by default and refuses non-Google hosts', async () => {
    await expect(
      resolveCoordinatesFromLink('https://goo.gl.evil.example/x'),
    ).resolves.toBeNull();
  });
});
