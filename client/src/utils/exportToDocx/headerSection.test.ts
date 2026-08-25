import { TextRun, type Paragraph } from 'docx';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Trip } from '@/types';

import { makeHeaderSection } from './headerSection';
import { makeImageParagraphs } from './imageHelpers';

// `docx` constructors are captured as plain, comparable objects instead of
// real component instances (see markdownToDocx.test.ts for the rationale).
// They are invoked with `new`, so the mock implementation must be a real
// `function` — an arrow function cannot be used as a constructor target.
vi.mock('docx', () => ({
  BorderStyle: { NONE: 'none', SINGLE: 'single' },
  HeadingLevel: { HEADING_1: 'Heading1' },
  Paragraph: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'Paragraph', options };
  }),
  TextRun: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'TextRun', options };
  }),
}));

vi.mock('./imageHelpers', () => ({ makeImageParagraphs: vi.fn() }));

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 1,
    title: '東京行',
    destination: '東京',
    startDate: '2026-08-20',
    endDate: '2026-08-22',
    description: '第一次去東京',
    createdAt: '2026-01-01T00:00:00.000Z',
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

describe('makeHeaderSection', () => {
  it('always includes a HEADING_1 paragraph with the trip title', async () => {
    const paragraphs = await makeHeaderSection(trip({ title: '東京行' }), 3);

    const heading = paragraphs.find(
      p =>
        (p as unknown as { options: { heading?: string } }).options.heading ===
        'Heading1',
    );
    expect(heading).toBeDefined();
    expect(textRuns()).toContain('東京行');
  });

  it('includes the total day count alongside the date range', async () => {
    await makeHeaderSection(trip(), 3);

    expect(textRuns().some(text => text.includes('( 3 天 )'))).toBe(true);
  });

  it.each([
    {
      description: 'set to a non-empty string',
      value: '東京',
      expectParagraph: true,
    },
    { description: 'null', value: null, expectParagraph: false },
  ])(
    'includes the destination paragraph only when destination is $description',
    async ({ value, expectParagraph }) => {
      await makeHeaderSection(trip({ destination: value }), 3);

      const matches = textRuns().filter(text => text === value);
      expect(matches).toHaveLength(expectParagraph ? 1 : 0);
    },
  );

  it.each([
    {
      description: 'set to a non-empty string',
      value: '第一次去東京',
      expectParagraph: true,
    },
    { description: 'undefined', value: undefined, expectParagraph: false },
    { description: 'an empty string', value: '', expectParagraph: false },
    { description: 'whitespace only', value: '   ', expectParagraph: false },
  ])(
    'includes the description paragraph only when description is $description',
    async ({ value, expectParagraph }) => {
      await makeHeaderSection(trip({ description: value }), 3);

      const matches = textRuns().filter(text => text === value);
      expect(matches).toHaveLength(expectParagraph ? 1 : 0);
    },
  );

  it.each([
    {
      description: 'trip.images has entries',
      images: [{ id: 1, filename: 'a.jpg', title: 'A' }],
      expectedCalls: 1,
    },
    { description: 'trip.images is empty', images: [], expectedCalls: 0 },
    {
      description: 'trip.images is undefined',
      images: undefined,
      expectedCalls: 0,
    },
  ])(
    'calls makeImageParagraphs once per trip image when $description',
    async ({ images, expectedCalls }) => {
      await makeHeaderSection(trip({ images }), 3);

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

    const paragraphs = await makeHeaderSection(trip({ images }), 3);

    expect(makeImageParagraphs).toHaveBeenNthCalledWith(1, images[0]);
    expect(makeImageParagraphs).toHaveBeenNthCalledWith(2, images[1]);
    expect(paragraphs).toContain(sentinelA);
    expect(paragraphs).toContain(sentinelB);
  });

  it('ends with a divider paragraph', async () => {
    const paragraphs = await makeHeaderSection(trip(), 3);

    const last = paragraphs[paragraphs.length - 1] as unknown as {
      options: { border?: unknown };
    };
    expect(last.options.border).toBeDefined();
  });
});
