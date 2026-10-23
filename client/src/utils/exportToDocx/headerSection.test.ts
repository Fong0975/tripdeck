import type { Paragraph } from 'docx';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { textRuns } from '@/test-utils/docx';
import { makeTrip } from '@/test-utils/fixtures';

import { makeHeaderSection } from './headerSection';
import { makeImageParagraphs } from './imageHelpers';

vi.mock('docx');

vi.mock('./imageHelpers', () => ({ makeImageParagraphs: vi.fn() }));

beforeEach(() => {
  vi.mocked(makeImageParagraphs).mockResolvedValue([]);
});

describe('makeHeaderSection', () => {
  it('always includes a HEADING_1 paragraph with the trip title', async () => {
    const paragraphs = await makeHeaderSection(
      makeTrip({ title: '東京行' }),
      3,
    );

    const heading = paragraphs.find(
      p =>
        (p as unknown as { options: { heading?: string } }).options.heading ===
        'Heading1',
    );
    expect(heading).toBeDefined();
    expect(textRuns()).toContain('東京行');
  });

  it('includes the total day count alongside the date range', async () => {
    await makeHeaderSection(makeTrip(), 3);

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
      await makeHeaderSection(makeTrip({ destination: value }), 3);

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
      await makeHeaderSection(makeTrip({ description: value }), 3);

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
      await makeHeaderSection(makeTrip({ images }), 3);

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

    const paragraphs = await makeHeaderSection(makeTrip({ images }), 3);

    expect(makeImageParagraphs).toHaveBeenNthCalledWith(1, images[0]);
    expect(makeImageParagraphs).toHaveBeenNthCalledWith(2, images[1]);
    expect(paragraphs).toContain(sentinelA);
    expect(paragraphs).toContain(sentinelB);
  });

  it('ends with a divider paragraph', async () => {
    const paragraphs = await makeHeaderSection(makeTrip(), 3);

    const last = paragraphs[paragraphs.length - 1] as unknown as {
      options: { border?: unknown };
    };
    expect(last.options.border).toBeDefined();
  });
});
