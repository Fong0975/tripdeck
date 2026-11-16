import { Document, Packer } from 'docx';

import type { Trip, TripContent } from '@/types';
import { downloadBlob } from '@/utils/download';
import { getWeatherEnabled } from '@/utils/weatherApi';

import { mapWithConcurrency } from './concurrency';
import { FONT } from './constants';
import { makeDaySectionTasks, type DocTask } from './daySection';
import type { ExportOptions } from './exportOptions';
import { makeHeaderSection } from './headerSection';
import { makeTimelineSection } from './timelineSection';

/**
 * Maximum number of content tasks (each typically fetching images or weather)
 * run at once while building the document.
 */
const EXPORT_CONCURRENCY = 4;

/**
 * Builds a Word document for the trip (header, timeline picture, then one
 * section per day, each opening with its date heading and map picture) and
 * downloads it as `<trip title>.docx`. Image and weather fetches run with
 * bounded concurrency; the document order always follows the itinerary.
 *
 * @param trip - The trip whose metadata forms the header section.
 * @param content - The trip's day plans.
 * @param options - The user's export settings.
 */
export async function exportToDocx(
  trip: Trip,
  content: TripContent,
  options: ExportOptions,
): Promise<void> {
  const isWeatherEnabled = await getWeatherEnabled();

  const tasks: DocTask[] = [
    () => makeHeaderSection(trip, content.days.length),
    () => makeTimelineSection(content.days, options.timeline),
    ...content.days.flatMap((day, dayIdx) =>
      makeDaySectionTasks(day, dayIdx === 0, isWeatherEnabled, options.dayMap),
    ),
  ];
  const children = (
    await mapWithConcurrency(tasks, EXPORT_CONCURRENCY, task => task())
  ).flat();

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 24 },
        },
        heading1: {
          run: { font: FONT, bold: true, size: 40, color: '111827' },
          paragraph: { indent: { left: 0, firstLine: 0 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${trip.title}.docx`);
}
