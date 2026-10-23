import type { Paragraph } from 'docx';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { textRuns } from '@/test-utils/docx';
import { makeDay } from '@/test-utils/fixtures';

import { makeDayNotesSection } from './dayNotesSection';
import { makeImageParagraphs } from './imageHelpers';

vi.mock('docx');

vi.mock('./imageHelpers', () => ({ makeImageParagraphs: vi.fn() }));

beforeEach(() => {
  vi.mocked(makeImageParagraphs).mockResolvedValue([]);
});

describe('makeDayNotesSection', () => {
  it('does not add a "備註：" heading — notes render as plain body text', async () => {
    await makeDayNotesSection(makeDay({ notes: 'Bring an umbrella' }));

    expect(textRuns()).not.toContain('備註：');
    expect(textRuns()).toContain('Bring an umbrella');
  });

  it.each([
    { description: 'undefined', notes: undefined, expectParagraph: false },
    { description: 'null', notes: null, expectParagraph: false },
    { description: 'an empty string', notes: '', expectParagraph: false },
    { description: 'whitespace only', notes: '   ', expectParagraph: false },
  ])(
    'includes a notes paragraph only when notes is $description',
    async ({ notes, expectParagraph }) => {
      const paragraphs = await makeDayNotesSection(makeDay({ notes }));

      expect(paragraphs.length > 0).toBe(expectParagraph);
    },
  );

  it('splits multi-line notes into one paragraph per line', async () => {
    await makeDayNotesSection(
      makeDay({ notes: 'Bring an umbrella\nPack sunscreen' }),
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
      await makeDayNotesSection(makeDay({ images }));

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

    const paragraphs = await makeDayNotesSection(makeDay({ images }));

    expect(makeImageParagraphs).toHaveBeenNthCalledWith(1, images[0]);
    expect(makeImageParagraphs).toHaveBeenNthCalledWith(2, images[1]);
    expect(paragraphs).toContain(sentinelA);
    expect(paragraphs).toContain(sentinelB);
  });
});
