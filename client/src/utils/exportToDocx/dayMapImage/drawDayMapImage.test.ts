import { describe, expect, it, vi } from 'vitest';

import { makeAttraction, makeDay } from '@/test-utils/fixtures';

import { buildDayMapModel } from './dayMapModel';
import { drawDayMapImage } from './drawDayMapImage';
import { projectCoordinates } from './mapProjection';

/** Minimal 2D context: every call is a spy and text is 7px per character. */
function makeContext() {
  return {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
  };
}

function draw(attractions: ReturnType<typeof makeAttraction>[]) {
  const ctx = makeContext();
  const model = buildDayMapModel(makeDay({ attractions }));
  drawDayMapImage(
    ctx as unknown as CanvasRenderingContext2D,
    model,
    projectCoordinates(model.stops),
  );
  return {
    ctx,
    texts: ctx.fillText.mock.calls.map(([text]) => text as string),
  };
}

const HOTEL = { latitude: 25.0, longitude: 121.5 };
const PARK = { latitude: 25.1, longitude: 121.6 };
const MUSEUM = { latitude: 25.05, longitude: 121.7 };

describe('drawDayMapImage', () => {
  it('draws each marker number with its title and time range', () => {
    const { texts } = draw([
      makeAttraction({
        id: 1,
        name: 'Hotel',
        startTime: '08:00',
        endTime: '09:00',
        ...HOTEL,
      }),
      makeAttraction({ id: 2, name: 'Park', startTime: '10:00', ...PARK }),
    ]);

    expect(texts).toEqual(
      expect.arrayContaining([
        '1',
        '2',
        'Hotel',
        '08:00–09:00',
        'Park',
        '10:00',
      ]),
    );
  });

  it.each([
    { name: 'a single stop', attractions: [{ id: 1, ...HOTEL }], segments: 0 },
    {
      name: 'two stops',
      attractions: [
        { id: 1, ...HOTEL },
        { id: 2, ...PARK },
      ],
      segments: 1,
    },
    {
      name: 'three stops',
      attractions: [
        { id: 1, ...HOTEL },
        { id: 2, ...PARK },
        { id: 3, ...MUSEUM },
      ],
      segments: 2,
    },
  ])(
    'draws $segments route segment(s) through the stops for $name',
    ({ attractions, segments }) => {
      const day = makeDay({
        attractions: attractions.map(a => makeAttraction(a)),
      });
      const model = buildDayMapModel(day);
      const projection = projectCoordinates(model.stops);
      const { ctx } = draw(attractions.map(a => makeAttraction(a)));

      const routeEnds = projection.points.slice(1).map(({ x, y }) => [x, y]);
      const lineToCalls = ctx.lineTo.mock.calls as number[][];
      const drawnEnds = routeEnds.filter(end =>
        lineToCalls.some(call => call[0] === end[0] && call[1] === end[1]),
      );
      expect(drawnEnds).toHaveLength(segments);
    },
  );

  it('merges a revisited spot into one marker and lists both attractions', () => {
    const { texts } = draw([
      makeAttraction({ id: 1, name: 'Hotel', ...HOTEL }),
      makeAttraction({ id: 2, name: 'Park', ...PARK }),
      makeAttraction({ id: 3, name: 'Hotel again', ...HOTEL }),
    ]);

    expect(texts).toEqual(
      expect.arrayContaining(['1·3', '1 Hotel', '3 Hotel again', '2', 'Park']),
    );
  });

  it('shortens long titles and counts attractions beyond the label limit', () => {
    const { texts } = draw([
      makeAttraction({ id: 1, name: 'A'.repeat(40), ...HOTEL }),
      makeAttraction({ id: 2, name: 'B', ...HOTEL }),
      makeAttraction({ id: 3, name: 'C', ...HOTEL }),
      makeAttraction({ id: 4, name: 'D', ...HOTEL }),
    ]);

    expect(
      texts.some(text => text.startsWith('1 AAAA') && text.endsWith('…')),
    ).toBe(true);
    expect(texts).toContain('…另 1 項');
  });
});
