import { ImageRun, Paragraph } from 'docx';

import type { DayPlan } from '@/types';

import { renderDayMapImage } from './dayMapImage/renderDayMapImage';
import type { DayMapExportOptions } from './exportOptions';

/**
 * Builds the picture of one day's attraction map, placed right after the day's
 * date heading. The picture is a bonus, so a drawing failure (for example no
 * canvas support) yields an empty section rather than failing the export.
 *
 * @param day - The day to draw.
 * @param options - The user's day map settings.
 * @returns The picture paragraph, or none when the picture is turned off or the
 *   day has no attraction with coordinates.
 */
export async function makeDayMapSection(
  day: DayPlan,
  options: DayMapExportOptions,
): Promise<Paragraph[]> {
  if (!options.enabled) {
    return [];
  }
  let picture;
  try {
    picture = await renderDayMapImage(day);
  } catch {
    return [];
  }
  if (!picture) {
    return [];
  }

  const { data, width, height } = picture;
  return [
    new Paragraph({
      children: [
        new ImageRun({
          data,
          transformation: { width, height },
          type: 'png',
        }),
      ],
      spacing: { before: 120, after: 160 },
    }),
  ];
}
