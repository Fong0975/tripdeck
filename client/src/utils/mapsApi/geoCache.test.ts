import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveTripGeo, type ResolveGeoResult } from '@/api/maps';
import { makeAttraction, makeDay } from '@/test-utils/fixtures';

import {
  __resetGeoCacheForTests,
  needsGeoResolution,
  resolveDayGeo,
  withResolvedGeo,
} from './geoCache';

vi.mock('@/api/maps', () => ({ resolveTripGeo: vi.fn() }));

const LOCATED = { latitude: 25, longitude: 121, geoSource: 'geocode' } as const;

function makeDays() {
  return [
    makeDay({
      id: 1,
      attractions: [
        makeAttraction({ id: 10, name: 'Museum' }),
        makeAttraction({ id: 11, name: 'Park' }),
      ],
    }),
    makeDay({
      id: 2,
      attractions: [makeAttraction({ id: 20, name: 'Tower' })],
    }),
  ];
}

function makeResult(
  overrides: Partial<ResolveGeoResult> = {},
): ResolveGeoResult {
  return {
    geocodeExhausted: false,
    attractions: [
      { id: 10, latitude: 25, longitude: 121, geoSource: 'geocode' },
      { id: 11, latitude: null, longitude: null, geoSource: null },
      { id: 20, latitude: null, longitude: null, geoSource: 'not_found' },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  __resetGeoCacheForTests();
  vi.mocked(resolveTripGeo).mockResolvedValue(makeResult());
});

describe('needsGeoResolution', () => {
  it.each([
    {
      description: 'every attraction already has a source',
      attractions: [
        makeAttraction({ id: 1, ...LOCATED }),
        makeAttraction({ id: 2, geoSource: 'not_found' }),
      ],
      expected: false,
    },
    {
      description: 'one attraction has no source',
      attractions: [
        makeAttraction({ id: 1, ...LOCATED }),
        makeAttraction({ id: 2 }),
      ],
      expected: true,
    },
    {
      description: 'there are no attractions',
      attractions: [],
      expected: false,
    },
  ])('is $expected when $description', ({ attractions, expected }) => {
    expect(needsGeoResolution([makeDay({ attractions })])).toBe(expected);
  });

  it('counts results resolved earlier in the session', async () => {
    const days = [
      makeDay({
        id: 1,
        attractions: [makeAttraction({ id: 10, name: 'Museum' })],
      }),
    ];
    expect(needsGeoResolution(days)).toBe(true);

    await resolveDayGeo(1, 1, days);

    expect(needsGeoResolution(days)).toBe(false);
  });
});

describe('resolveDayGeo', () => {
  it('requests the backend and returns its result', async () => {
    const result = await resolveDayGeo(5, 1, makeDays());

    expect(resolveTripGeo).toHaveBeenCalledWith(5, 1);
    expect(result).toEqual(makeResult());
  });

  it('overlays resolved results but not unresolved ones', async () => {
    const days = makeDays();

    await resolveDayGeo(5, 1, days);

    const [day1, day2] = withResolvedGeo(days);
    expect(day1.attractions[0]).toMatchObject(LOCATED);
    expect(day1.attractions[1].geoSource).toBeUndefined();
    expect(day2.attractions[0]).toMatchObject({
      latitude: null,
      geoSource: 'not_found',
    });
  });

  it('does not repeat an identical request', async () => {
    const days = makeDays();

    await resolveDayGeo(5, 1, days);
    const again = await resolveDayGeo(5, 1, days);

    expect(again).toBeNull();
    expect(resolveTripGeo).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      description: 'another day is selected',
      call: () => resolveDayGeo(5, 2, makeDays()),
    },
    {
      description: 'another trip is mapped',
      call: () => resolveDayGeo(6, 1, makeDays()),
    },
    {
      description: 'an attraction was renamed',
      call: () => {
        const days = makeDays();
        days[0].attractions[0].name = 'Renamed';
        return resolveDayGeo(5, 1, days);
      },
    },
    {
      description: 'an attraction link changed',
      call: () => {
        const days = makeDays();
        days[0].attractions[0].googleMapUrl = 'https://maps.app.goo.gl/x';
        return resolveDayGeo(5, 1, days);
      },
    },
  ])('requests again when $description', async ({ call }) => {
    await resolveDayGeo(5, 1, makeDays());

    await call();

    expect(resolveTripGeo).toHaveBeenCalledTimes(2);
  });

  it('shares one request between concurrent callers', async () => {
    const days = makeDays();

    const [first, second] = await Promise.all([
      resolveDayGeo(5, 1, days),
      resolveDayGeo(5, 1, days),
    ]);

    expect(resolveTripGeo).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('does not remember a failed request', async () => {
    vi.mocked(resolveTripGeo).mockRejectedValueOnce(new Error('API error 500'));
    const days = makeDays();

    await expect(resolveDayGeo(5, 1, days)).rejects.toThrow('API error 500');
    await expect(resolveDayGeo(5, 1, days)).resolves.toEqual(makeResult());

    expect(resolveTripGeo).toHaveBeenCalledTimes(2);
  });

  it('ignores results for attractions it does not know', async () => {
    vi.mocked(resolveTripGeo).mockResolvedValue(
      makeResult({
        attractions: [{ id: 999, latitude: 1, longitude: 2, geoSource: 'url' }],
      }),
    );
    const days = makeDays();

    await resolveDayGeo(5, 1, days);

    expect(withResolvedGeo(days)).toEqual(days);
  });
});

describe('withResolvedGeo', () => {
  it('leaves attractions untouched before anything was resolved', () => {
    const days = makeDays();

    expect(withResolvedGeo(days)).toEqual(days);
  });

  it.each([
    {
      description: 'renamed',
      edit: (a: { name: string }) => {
        a.name = 'Renamed';
      },
    },
    {
      description: 'given a new link',
      edit: (a: { googleMapUrl?: string | null }) => {
        a.googleMapUrl = 'https://maps.app.goo.gl/x';
      },
    },
  ])(
    'drops a cached location once the attraction is $description',
    async ({ edit }) => {
      const days = makeDays();
      await resolveDayGeo(5, 1, days);

      edit(days[0].attractions[0] as never);

      expect(withResolvedGeo(days)[0].attractions[0].geoSource).toBeUndefined();
    },
  );

  it('does not mutate its input', async () => {
    const days = makeDays();
    await resolveDayGeo(5, 1, days);

    withResolvedGeo(days);

    expect(days[0].attractions[0].geoSource).toBeUndefined();
  });
});
