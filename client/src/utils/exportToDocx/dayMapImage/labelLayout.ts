import type { CanvasPoint } from './mapProjection';

/** An axis-aligned rectangle in logical pixels. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A marker the labels must keep clear of. */
export interface MarkerSpot extends CanvasPoint {
  radius: number;
}

/** A label to place beside its marker. */
export interface LabelRequest {
  /** Index into the markers array of the marker the label belongs to. */
  markerIndex: number;
  width: number;
  height: number;
}

/** Gap between a marker's edge and its label. */
const GAP = 4;
/** Penalty per pixel of label area outside the surface; dwarfs any overlap. */
const OUT_OF_BOUNDS_WEIGHT = 1000;

/**
 * Area of the intersection of two rectangles; 0 when they do not overlap.
 *
 * @param a - First rectangle.
 * @param b - Second rectangle.
 */
export function overlapArea(a: Rect, b: Rect): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
}

function markerRect(marker: MarkerSpot): Rect {
  return {
    x: marker.x - marker.radius,
    y: marker.y - marker.radius,
    width: marker.radius * 2,
    height: marker.radius * 2,
  };
}

/** Candidate positions around a marker, most preferred first. */
function candidates(marker: MarkerSpot, label: LabelRequest): Rect[] {
  const { x, y, radius } = marker;
  const { width, height } = label;
  const right = x + radius + GAP;
  const left = x - radius - GAP - width;
  const above = y - radius - GAP - height;
  const below = y + radius + GAP;
  const middle = y - height / 2;
  const centered = x - width / 2;
  return [
    { x: right, y: middle, width, height },
    { x: left, y: middle, width, height },
    { x: centered, y: above, width, height },
    { x: centered, y: below, width, height },
    { x: right, y: above, width, height },
    { x: right, y: below, width, height },
    { x: left, y: above, width, height },
    { x: left, y: below, width, height },
  ];
}

function outOfBoundsArea(rect: Rect, width: number, height: number): number {
  const inside = overlapArea(rect, { x: 0, y: 0, width, height });
  return rect.width * rect.height - inside;
}

/** Shifts a rectangle just enough to lie inside the surface when it fits. */
function clampToSurface(
  rect: Rect,
  surface: { width: number; height: number },
): Rect {
  const maxX = Math.max(0, surface.width - rect.width);
  const maxY = Math.max(0, surface.height - rect.height);
  return {
    ...rect,
    x: Math.min(Math.max(rect.x, 0), maxX),
    y: Math.min(Math.max(rect.y, 0), maxY),
  };
}

/**
 * Places each label beside its marker, preferring right, left, above, then
 * below, and diagonals last. Each label takes the first position that is
 * inside the surface and clear of markers and earlier labels; if none is
 * clean, the one with the least overlap wins. Labels are placed in request
 * order, so earlier labels get first pick.
 *
 * @param markers - Every marker on the surface.
 * @param labels - The labels to place.
 * @param surface - Logical size of the drawing surface.
 * @returns One rectangle per label, in request order.
 */
export function placeLabels(
  markers: MarkerSpot[],
  labels: LabelRequest[],
  surface: { width: number; height: number },
): Rect[] {
  const markerRects = markers.map(markerRect);
  const placed: Rect[] = [];

  for (const label of labels) {
    const marker = markers[label.markerIndex];
    let best: Rect | null = null;
    let bestScore = Infinity;

    for (const rect of candidates(marker, label)) {
      const score =
        outOfBoundsArea(rect, surface.width, surface.height) *
          OUT_OF_BOUNDS_WEIGHT +
        [...markerRects, ...placed].reduce(
          (sum, other) => sum + overlapArea(rect, other),
          0,
        );
      if (score < bestScore) {
        best = rect;
        bestScore = score;
      }
      if (score === 0) {
        break;
      }
    }

    placed.push(clampToSurface(best as Rect, surface));
  }

  return placed;
}
