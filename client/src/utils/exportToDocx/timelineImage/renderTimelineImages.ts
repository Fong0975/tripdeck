import type { DayPlan } from '@/types';

import { renderCanvasToPng, type RenderedPicture } from '../canvasHelpers';
import type { DaysPerImage } from '../exportOptions';

import { drawTimelineImage } from './drawTimelineImage';
import {
  IMAGE_SCALE,
  planTimelineImages,
  type TimelineImagePlan,
} from './timelineImageLayout';

/** A rendered timeline picture ready to embed in the document. */
export type TimelineImage = RenderedPicture;

async function renderPlan(plan: TimelineImagePlan): Promise<TimelineImage> {
  const data = await renderCanvasToPng(
    plan.width,
    plan.height,
    IMAGE_SCALE,
    ctx => drawTimelineImage(ctx, plan),
  );
  return { data, width: plan.displayWidth, height: plan.displayHeight };
}

/**
 * Draws the trip's timeline as PNG pictures, evenly splitting the days when
 * there are more than `daysPerImage`.
 *
 * @param days - The trip's days.
 * @param daysPerImage - How many days each picture holds at most.
 * @returns The pictures in day order; empty when no attraction has a usable time.
 * @throws {Error} when the canvas cannot provide a 2D context or encode a PNG.
 */
export async function renderTimelineImages(
  days: DayPlan[],
  daysPerImage: DaysPerImage,
): Promise<TimelineImage[]> {
  return Promise.all(planTimelineImages(days, daysPerImage).map(renderPlan));
}
