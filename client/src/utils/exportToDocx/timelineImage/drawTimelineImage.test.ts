import { describe, expect, it, vi } from 'vitest';

import { makeAttraction, makeConnection, makeDay } from '@/test-utils/fixtures';

import { drawTimelineImage, fitText } from './drawTimelineImage';
import { planTimelineImages } from './timelineImageLayout';

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
  } as unknown as CanvasRenderingContext2D & {
    fillRect: ReturnType<typeof vi.fn>;
    fillText: ReturnType<typeof vi.fn>;
    roundRect: ReturnType<typeof vi.fn>;
  };
}

function drawnTexts(ctx: ReturnType<typeof makeContext>): string[] {
  return ctx.fillText.mock.calls.map(([text]) => text as string);
}

describe('fitText', () => {
  it.each([
    { text: 'abc', maxWidth: 100, expected: 'abc' },
    { text: 'abcdefghij', maxWidth: 70, expected: 'abcdefghij' },
    { text: 'abcdefghij', maxWidth: 40, expected: 'abcd…' },
    { text: 'abcdefghij', maxWidth: 3, expected: '…' },
  ])(
    'fits "$text" into $maxWidth px as "$expected"',
    ({ text, maxWidth, expected }) => {
      const ctx = makeContext();

      expect(fitText(ctx, text, maxWidth)).toBe(expected);
    },
  );
});

describe('drawTimelineImage', () => {
  const day = makeDay({
    id: 1,
    day: 1,
    date: '2026-09-12',
    attractions: [
      makeAttraction({
        id: 1,
        name: 'Castle',
        startTime: '10:30',
        endTime: '12:00',
      }),
      makeAttraction({
        id: 2,
        name: 'Garden',
        startTime: '12:15',
        endTime: '14:30',
      }),
      makeAttraction({ id: 3, name: 'Market' }),
    ],
    connections: [
      makeConnection({
        fromAttractionId: 1,
        toAttractionId: 2,
        transportMode: 'transit',
        duration: '15',
      }),
    ],
  });

  function draw() {
    const [plan] = planTimelineImages([day]);
    const ctx = makeContext();
    drawTimelineImage(ctx, plan);
    return { ctx, plan };
  }

  it('paints a white background over the whole surface', () => {
    const { ctx, plan } = draw();

    expect(ctx.fillRect).toHaveBeenNthCalledWith(
      1,
      0,
      0,
      plan.width,
      plan.height,
    );
  });

  it.each([
    { description: 'the day header', text: 'Day 1' },
    { description: 'an hour label', text: '11:00' },
    { description: 'an attraction name', text: 'Castle' },
    { description: 'a range time', text: '10:30–12:00' },
    { description: 'the unscheduled label', text: '未排時間' },
    { description: 'an unscheduled attraction', text: 'Market' },
    { description: 'a travel leg', text: '🚇 大眾運輸 15 分鐘' },
  ])('draws $description', ({ text }) => {
    const { ctx } = draw();

    expect(drawnTexts(ctx)).toContain(text);
  });

  it('omits the unscheduled label when every attraction has a time', () => {
    const [plan] = planTimelineImages([
      makeDay({
        attractions: [
          makeAttraction({
            name: 'Castle',
            startTime: '10:00',
            endTime: '11:00',
          }),
        ],
      }),
    ]);
    const ctx = makeContext();

    drawTimelineImage(ctx, plan);

    expect(drawnTexts(ctx)).not.toContain('未排時間');
  });

  it('draws a bar and a card for every scheduled block', () => {
    const { ctx } = draw();

    // Two attractions and one travel leg: a bar and a card each, plus the
    // unscheduled entry's rounded box.
    expect(ctx.roundRect).toHaveBeenCalledTimes(3 * 2 + 1);
  });
});
