import {
  buildDayTimeline,
  type DayTimeline,
} from '@/components/TripTimelineModal/buildDayTimeline';
import {
  layoutDay,
  type DayLayout,
} from '@/components/TripTimelineModal/layoutCards';
import {
  computeTimelineRange,
  type TimelineRange,
} from '@/components/TripTimelineModal/timelineRange';
import type { DayPlan } from '@/types';

import { CONTENT_WIDTH_PX } from '../constants';

/** Most days drawn side by side in one image. */
export const MAX_DAYS_PER_IMAGE = 4;
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

/** Logical width of a full image (the widest one), the basis for sizing. */
const FULL_IMAGE_WIDTH = AXIS_WIDTH + MAX_DAYS_PER_IMAGE * DAY_WIDTH;

/** Everything needed to draw one image of up to {@link MAX_DAYS_PER_IMAGE} days. */
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
 * Splits days into evenly sized groups of at most {@link MAX_DAYS_PER_IMAGE},
 * e.g. 5 days become 3 + 2 rather than 4 + 1.
 */
export function chunkDays<T>(items: T[]): T[][] {
  if (items.length === 0) {
    return [];
  }
  const chunkCount = Math.ceil(items.length / MAX_DAYS_PER_IMAGE);
  const size = Math.ceil(items.length / chunkCount);
  return Array.from({ length: chunkCount }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );
}

/**
 * Scales a logical size to fit the document: the same text size as a full
 * image, shrunk further only when it would be taller than a page.
 */
function toDisplaySize(
  width: number,
  height: number,
): { displayWidth: number; displayHeight: number } {
  const scale = Math.min(
    CONTENT_WIDTH_PX / FULL_IMAGE_WIDTH,
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
 * @returns One plan per image; empty when no attraction has a usable time.
 */
export function planTimelineImages(days: DayPlan[]): TimelineImagePlan[] {
  const timelines = days.map(buildDayTimeline);
  const range = computeTimelineRange(timelines);
  if (!range) {
    return [];
  }

  return chunkDays(timelines).map(group => {
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
