import type { DayPlan } from '@/types';

import { drawTimelineImage } from './drawTimelineImage';
import {
  IMAGE_SCALE,
  planTimelineImages,
  type TimelineImagePlan,
} from './timelineImageLayout';

/** A rendered timeline picture ready to embed in the document. */
export interface TimelineImage {
  /** PNG bytes. */
  data: ArrayBuffer;
  /** Size in the document, in docx pixels. */
  width: number;
  height: number;
}

async function renderPlan(plan: TimelineImagePlan): Promise<TimelineImage> {
  const canvas = document.createElement('canvas');
  canvas.width = plan.width * IMAGE_SCALE;
  canvas.height = plan.height * IMAGE_SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  ctx.scale(IMAGE_SCALE, IMAGE_SCALE);
  drawTimelineImage(ctx, plan);

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) {
    throw new Error('PNG encoding failed');
  }
  return {
    data: await blob.arrayBuffer(),
    width: plan.displayWidth,
    height: plan.displayHeight,
  };
}

/**
 * Draws the trip's timeline as PNG pictures: up to four days per picture,
 * evenly split when there are more.
 *
 * @param days - The trip's days.
 * @returns The pictures in day order; empty when no attraction has a usable time.
 * @throws {Error} when the canvas cannot provide a 2D context or encode a PNG.
 */
export async function renderTimelineImages(
  days: DayPlan[],
): Promise<TimelineImage[]> {
  return Promise.all(planTimelineImages(days).map(renderPlan));
}
