import { TextRun, type Paragraph } from 'docx';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DayPlan } from '@/types';

import { makeDayNotesSection } from './dayNotesSection';
import { makeImageParagraphs } from './imageHelpers';

// `docx` constructors are captured as plain, comparable objects instead of
// real component instances (see markdownToDocx.test.ts for the rationale).
// They are invoked with `new`, so the mock implementation must be a real
// `function` — an arrow function cannot be used as a constructor target.
// `BorderStyle` is mocked because `./constants` reads it at module-init time.
vi.mock('docx', () => ({
  BorderStyle: { NONE: 'none', SINGLE: 'single' },
  Paragraph: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'Paragraph', options };
  }),
  TextRun: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'TextRun', options };
  }),
}));

vi.mock('./imageHelpers', () => ({ makeImageParagraphs: vi.fn() }));

function dayPlan(overrides: Partial<DayPlan> = {}): DayPlan {
  return {
    id: 1,
    day: 1,
    date: '2026-08-20',
    locations: [],
    attractions: [],
    connections: [],
    ...overrides,
  };
}

function textRuns(): string[] {
  return vi
    .mocked(TextRun)
    .mock.calls.map(([options]) => (options as { text: string }).text);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(makeImageParagraphs).mockResolvedValue([]);
});

describe('makeDayNotesSection', () => {
  it('does not add a "備註：" heading — notes render as plain body text', async () => {
    await makeDayNotesSection(dayPlan({ notes: 'Bring an umbrella' }));

    expect(textRuns()).not.toContain('備註：');
    expect(textRuns()).toContain('Bring an umbrella');
  });

  it.each([
    {
      description: 'set to a non-empty string',
      notes: 'Bring an umbrella',
      expectParagraph: true,
    },
    { description: 'undefined', notes: undefined, expectParagraph: false },
    { description: 'null', notes: null, expectParagraph: false },
    { description: 'an empty string', notes: '', expectParagraph: false },
    { description: 'whitespace only', notes: '   ', expectParagraph: false },
  ])(
    'includes a notes paragraph only when notes is $description',
    async ({ notes, expectParagraph }) => {
      const paragraphs = await makeDayNotesSection(dayPlan({ notes }));

      expect(paragraphs.length > 0).toBe(expectParagraph);
    },
  );

  it('splits multi-line notes into one paragraph per line', async () => {
    await makeDayNotesSection(
      dayPlan({ notes: 'Bring an umbrella\nPack sunscreen' }),
    );

    expect(textRuns()).toContain('Bring an umbrella');
    expect(textRuns()).toContain('Pack sunscreen');
  });

  it.each([
    {
      description: 'day.images has entries',
      images: [{ id: 1, filename: 'a.jpg', title: 'A' }],
      expectedCalls: 1,
    },
    { description: 'day.images is empty', images: [], expectedCalls: 0 },
    {
      description: 'day.images is undefined',
      images: undefined,
      expectedCalls: 0,
    },
  ])(
    'calls makeImageParagraphs once per day image when $description',
    async ({ images, expectedCalls }) => {
      await makeDayNotesSection(dayPlan({ images }));

      expect(makeImageParagraphs).toHaveBeenCalledTimes(expectedCalls);
    },
  );

  it('appends the paragraphs returned by makeImageParagraphs, in image order', async () => {
    const sentinelA = { type: 'Paragraph', options: { sentinel: 'A' } };
    const sentinelB = { type: 'Paragraph', options: { sentinel: 'B' } };
    vi.mocked(makeImageParagraphs)
      .mockResolvedValueOnce([sentinelA as unknown as Paragraph])
      .mockResolvedValueOnce([sentinelB as unknown as Paragraph]);
    const images = [
      { id: 1, filename: 'a.jpg', title: 'A' },
      { id: 2, filename: 'b.jpg', title: 'B' },
    ];

    const paragraphs = await makeDayNotesSection(dayPlan({ images }));

    expect(makeImageParagraphs).toHaveBeenNthCalledWith(1, images[0]);
    expect(makeImageParagraphs).toHaveBeenNthCalledWith(2, images[1]);
    expect(paragraphs).toContain(sentinelA);
    expect(paragraphs).toContain(sentinelB);
  });

  it('returns an empty array when the day has no notes and no images', async () => {
    const paragraphs = await makeDayNotesSection(
      dayPlan({ notes: null, images: [] }),
    );

    expect(paragraphs).toEqual([]);
  });
});
