import { beforeEach, describe, expect, it, vi } from 'vitest';

import { textRuns } from '@/test-utils/docx';
import { makeDay } from '@/test-utils/fixtures';

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

describe('makeTimelineSection', () => {
  it('passes the days to the renderer', async () => {
    await makeTimelineSection(days);

    expect(renderTimelineImages).toHaveBeenCalledWith(days);
  });

  it('returns nothing when there are no images', async () => {
    await expect(makeTimelineSection(days)).resolves.toEqual([]);
    expect(textRuns()).not.toContain('行程時間軸');
  });

  it('returns nothing when drawing fails, instead of throwing', async () => {
    vi.mocked(renderTimelineImages).mockRejectedValue(new Error('no canvas'));

    await expect(makeTimelineSection(days)).resolves.toEqual([]);
  });

  it('adds the title before one PNG paragraph per image', async () => {
    const first = new ArrayBuffer(1);
    const second = new ArrayBuffer(2);
    vi.mocked(renderTimelineImages).mockResolvedValue([
      { data: first, width: 602, height: 400 },
      { data: second, width: 400, height: 300 },
    ]);

    const paragraphs = (await makeTimelineSection(days)) as unknown as Node[];

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
