import { ImageRun, Paragraph, TextRun } from 'docx';

import type { DayPlan } from '@/types';

import { FONT } from './constants';
import { renderTimelineImages } from './timelineImage/renderTimelineImages';

/**
 * Builds the "行程時間軸" section: a small title followed by the timeline
 * picture(s). The picture is a bonus, so a drawing failure (for example no
 * canvas support) yields an empty section rather than failing the export.
 *
 * @param days - The trip's days.
 * @returns The section's paragraphs, or none when no attraction has a time.
 */
export async function makeTimelineSection(
  days: DayPlan[],
): Promise<Paragraph[]> {
  let images;
  try {
    images = await renderTimelineImages(days);
  } catch {
    return [];
  }
  if (images.length === 0) {
    return [];
  }

  return [
    new Paragraph({
      children: [
        new TextRun({ text: '行程時間軸', bold: true, size: 28, font: FONT }),
      ],
      spacing: { before: 0, after: 120 },
    }),
    ...images.map(
      ({ data, width, height }) =>
        new Paragraph({
          children: [
            new ImageRun({
              data,
              transformation: { width, height },
              type: 'png',
            }),
          ],
          spacing: { before: 60, after: 120 },
        }),
    ),
    new Paragraph({ children: [], spacing: { before: 0, after: 200 } }),
  ];
}
