import type { DayPlan } from '@/types';

import { renderCanvasToPng, type RenderedPicture } from '../canvasHelpers';
import { IMAGE_SCALE } from '../timelineImage/timelineImageLayout';

import { buildDayMapModel } from './dayMapModel';
import { drawDayMapImage } from './drawDayMapImage';
import { projectCoordinates } from './mapProjection';

/**
 * Draws one day's attraction map as a PNG picture: numbered markers, the route
 * between them, and each marker's title and time range. Only the given day's
 * attractions are drawn.
 *
 * @param day - The day to draw.
 * @returns The picture sized for the document, or null when the day has no
 *   attraction with coordinates.
 * @throws {Error} when the canvas cannot provide a 2D context or encode a PNG.
 */
export async function renderDayMapImage(
  day: DayPlan,
): Promise<RenderedPicture | null> {
  const model = buildDayMapModel(day);
  if (model.stops.length === 0) {
    return null;
  }

  const projection = projectCoordinates(model.stops);
  const data = await renderCanvasToPng(
    projection.width,
    projection.height,
    IMAGE_SCALE,
    ctx => drawDayMapImage(ctx, model, projection),
  );
  return {
    data,
    width: projection.width,
    height: Math.round(projection.height),
  };
}
