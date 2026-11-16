import { beforeEach, describe, expect, it, vi } from 'vitest';

import { textRuns } from '@/test-utils/docx';
import { makeDay } from '@/test-utils/fixtures';

import type { TimelineExportOptions } from './exportOptions';
import { renderTimelineImages } from './timelineImage/renderTimelineImages';
import { makeTimelineSection } from './timelineSection';

vi.mock('docx');
vi.mock('./timelineImage/renderTimelineImages', () => ({
  renderTimelineImages: vi.fn(),
}));

type Node = { type: string; options: Record<string, unknown> };

const days = [makeDay()];

beforeEach(() => {
  vi.mocked(renderTimelineImages).mockResolvedValue([]);
});

const enabled: TimelineExportOptions = { enabled: true, daysPerImage: 4 };

describe('makeTimelineSection', () => {
  it.each([1, 2, 'all'] as const)(
    'passes the days and %s days per image to the renderer',
    async daysPerImage => {
      await makeTimelineSection(days, { enabled: true, daysPerImage });

      expect(renderTimelineImages).toHaveBeenCalledWith(days, daysPerImage);
    },
  );

  it('skips drawing and returns nothing when the section is turned off', async () => {
    vi.mocked(renderTimelineImages).mockResolvedValue([
      { data: new ArrayBuffer(1), width: 10, height: 10 },
    ]);

    await expect(
      makeTimelineSection(days, { enabled: false, daysPerImage: 4 }),
    ).resolves.toEqual([]);
    expect(renderTimelineImages).not.toHaveBeenCalled();
    expect(textRuns()).not.toContain('行程時間軸');
  });

  it('returns nothing when there are no images', async () => {
    await expect(makeTimelineSection(days, enabled)).resolves.toEqual([]);
    expect(textRuns()).not.toContain('行程時間軸');
  });

  it('returns nothing when drawing fails, instead of throwing', async () => {
    vi.mocked(renderTimelineImages).mockRejectedValue(new Error('no canvas'));

    await expect(makeTimelineSection(days, enabled)).resolves.toEqual([]);
  });

  it('adds the title before one PNG paragraph per image', async () => {
    const first = new ArrayBuffer(1);
    const second = new ArrayBuffer(2);
    vi.mocked(renderTimelineImages).mockResolvedValue([
      { data: first, width: 602, height: 400 },
      { data: second, width: 400, height: 300 },
    ]);

    const paragraphs = (await makeTimelineSection(
      days,
      enabled,
    )) as unknown as Node[];

    expect(textRuns()).toEqual(['行程時間軸']);
    const images = paragraphs
      .flatMap(p => (p.options.children as Node[]) ?? [])
      .filter(child => child.type === 'ImageRun')
      .map(child => child.options);
    expect(images).toEqual([
      { data: first, transformation: { width: 602, height: 400 }, type: 'png' },
      {
        data: second,
        transformation: { width: 400, height: 300 },
        type: 'png',
      },
    ]);
  });
});
