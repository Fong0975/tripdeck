import type { DayPlan } from '@/types';
import {
  buildDayTimeline,
  type DayTimeline,
} from '@/utils/timeline/buildDayTimeline';
import { layoutDay, type DayLayout } from '@/utils/timeline/layoutCards';
import {
  computeTimelineRange,
  type TimelineRange,
} from '@/utils/timeline/timelineRange';

import { CONTENT_WIDTH_PX } from '../constants';
import type { DaysPerImage } from '../exportOptions';

/** Days that fill the page width; the basis for the text size in the document. */
export const FULL_WIDTH_DAYS = 4;
/** Logical width of the hour-label column. */
export const AXIS_WIDTH = 48;
/** Logical width of one day column. */
export const DAY_WIDTH = 168;
/** Logical height of the day header row. */
export const HEADER_HEIGHT = 46;
/** Logical height of one entry in the unscheduled section. */
export const UNSCHEDULED_ROW_HEIGHT = 22;
/** Vertical padding above and below the unscheduled entries. */
export const UNSCHEDULED_PADDING = 6;
/** Canvas pixels per logical pixel, for a sharp image when zoomed. */
export const IMAGE_SCALE = 2;
/** Tallest an image may appear in the document, in docx pixels. */
export const MAX_DISPLAY_HEIGHT_PX = 820;

/** Logical width of an image of {@link FULL_WIDTH_DAYS} days, the sizing basis. */
const FULL_IMAGE_WIDTH = AXIS_WIDTH + FULL_WIDTH_DAYS * DAY_WIDTH;

/** Everything needed to draw one timeline image. */
export interface TimelineImagePlan {
  timelines: DayTimeline[];
  layouts: DayLayout[];
  range: TimelineRange;
  /** Logical size of the drawing surface. */
  width: number;
  height: number;
  /** Height of the unscheduled section; 0 when no day in the image has one. */
  unscheduledHeight: number;
  /** Size the image takes in the document, in docx pixels. */
  displayWidth: number;
  displayHeight: number;
}

/**
 * Splits days into evenly sized groups of at most `daysPerImage`, e.g. 5 days
 * with a limit of 4 become 3 + 2 rather than 4 + 1.
 *
 * @param items - The items to split, in order.
 * @param daysPerImage - The group size limit; `'all'` keeps one group.
 */
export function chunkDays<T>(items: T[], daysPerImage: DaysPerImage): T[][] {
  if (items.length === 0) {
    return [];
  }
  const limit = daysPerImage === 'all' ? items.length : daysPerImage;
  const chunkCount = Math.ceil(items.length / limit);
  const size = Math.ceil(items.length / chunkCount);
  return Array.from({ length: chunkCount }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );
}

/**
 * Scales a logical size to fit the document: the same text size as a full
 * image, shrunk further only when it would be wider or taller than a page.
 */
function toDisplaySize(
  width: number,
  height: number,
): { displayWidth: number; displayHeight: number } {
  const scale = Math.min(
    CONTENT_WIDTH_PX / Math.max(FULL_IMAGE_WIDTH, width),
    MAX_DISPLAY_HEIGHT_PX / height,
  );
  return {
    displayWidth: Math.round(width * scale),
    displayHeight: Math.round(height * scale),
  };
}

/**
 * Plans the timeline images of a trip. All images share one hour range so
 * their axes line up.
 *
 * @param days - The trip's days.
 * @param daysPerImage - How many days each image holds at most.
 * @returns One plan per image; empty when no attraction has a usable time.
 */
export function planTimelineImages(
  days: DayPlan[],
  daysPerImage: DaysPerImage,
): TimelineImagePlan[] {
  const timelines = days.map(buildDayTimeline);
  const range = computeTimelineRange(timelines);
  if (!range) {
    return [];
  }

  return chunkDays(timelines, daysPerImage).map(group => {
    const layouts = group.map(t => layoutDay(t.blocks, range));
    const maxUnscheduled = Math.max(...group.map(t => t.unscheduled.length));
    const unscheduledHeight =
      maxUnscheduled > 0
        ? UNSCHEDULED_PADDING * 2 + maxUnscheduled * UNSCHEDULED_ROW_HEIGHT
        : 0;
    const width = AXIS_WIDTH + group.length * DAY_WIDTH;
    const height =
      HEADER_HEIGHT +
      unscheduledHeight +
      Math.max(...layouts.map(l => l.height));
    return {
      timelines: group,
      layouts,
      range,
      width,
      height,
      unscheduledHeight,
      ...toDisplaySize(width, height),
    };
  });
}
