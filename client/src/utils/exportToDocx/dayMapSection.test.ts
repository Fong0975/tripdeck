import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeDay } from '@/test-utils/fixtures';

import { renderDayMapImage } from './dayMapImage/renderDayMapImage';
import { makeDayMapSection } from './dayMapSection';

vi.mock('docx');
vi.mock('./dayMapImage/renderDayMapImage', () => ({
  renderDayMapImage: vi.fn(),
}));

type Node = { type: string; options: Record<string, unknown> };

const day = makeDay();
const enabled = { enabled: true };

beforeEach(() => {
  vi.mocked(renderDayMapImage).mockResolvedValue(null);
});

describe('makeDayMapSection', () => {
  it('draws the given day when turned on', async () => {
    await makeDayMapSection(day, enabled);

    expect(renderDayMapImage).toHaveBeenCalledWith(day);
  });

  it('skips drawing and returns nothing when turned off', async () => {
    vi.mocked(renderDayMapImage).mockResolvedValue({
      data: new ArrayBuffer(1),
      width: 10,
      height: 10,
    });

    await expect(makeDayMapSection(day, { enabled: false })).resolves.toEqual(
      [],
    );
    expect(renderDayMapImage).not.toHaveBeenCalled();
  });

  it.each([
    {
      description: 'the day has no locatable attraction',
      setup: () => vi.mocked(renderDayMapImage).mockResolvedValue(null),
    },
    {
      description: 'drawing fails',
      setup: () =>
        vi.mocked(renderDayMapImage).mockRejectedValue(new Error('no canvas')),
    },
  ])(
    'returns nothing, without throwing, when $description',
    async ({ setup }) => {
      setup();

      await expect(makeDayMapSection(day, enabled)).resolves.toEqual([]);
    },
  );

  it('wraps the picture in one PNG paragraph at its size', async () => {
    const data = new ArrayBuffer(4);
    vi.mocked(renderDayMapImage).mockResolvedValue({
      data,
      width: 602,
      height: 400,
    });

    const paragraphs = (await makeDayMapSection(
      day,
      enabled,
    )) as unknown as Node[];

    expect(paragraphs).toHaveLength(1);
    const images = (paragraphs[0].options.children as Node[])
      .filter(child => child.type === 'ImageRun')
      .map(child => child.options);
    expect(images).toEqual([
      { data, transformation: { width: 602, height: 400 }, type: 'png' },
    ]);
  });
});
