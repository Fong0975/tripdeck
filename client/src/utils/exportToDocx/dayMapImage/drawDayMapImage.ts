import { getBlockColor } from '@/utils/timeline/timelinePalette';

import {
  canvasFont,
  fillRoundRect,
  fitText,
  strokeRoundRect,
} from '../canvasHelpers';

import type { DayMapModel, DayMapStop } from './dayMapModel';
import {
  placeLabels,
  type LabelRequest,
  type MarkerSpot,
  type Rect,
} from './labelLayout';
import type { MapProjection } from './mapProjection';

const COLORS = {
  background: '#f8fafc',
  grid: '#e8edf3',
  route: 'rgba(37, 99, 235, 0.85)',
  markerBorder: '#ffffff',
  markerText: '#ffffff',
  labelFill: 'rgba(255, 255, 255, 0.94)',
} as const;

const GRID_STEP = 48;
const ROUTE_WIDTH = 3;
const MARKER_RADIUS = 12;
const MARKER_TEXT_PADDING = 7;
const LABEL_MAX_TEXT_WIDTH = 150;
const LABEL_PADDING_X = 7;
const LABEL_PADDING_Y = 5;
const NAME_LINE_HEIGHT = 16;
const TIME_LINE_HEIGHT = 14;
const LABEL_RADIUS = 5;
/** Attractions listed in one label; the rest collapse into a count line. */
const MAX_LABEL_ENTRIES = 3;

interface LabelLine {
  text: string;
  bold: boolean;
  height: number;
}

interface MarkerShape extends MarkerSpot {
  /** Width of the capsule that holds the label text. */
  width: number;
  color: string;
}

function getStopColor(stop: DayMapStop): string {
  return getBlockColor(stop.entries[0].order - 1).solid;
}

function describeLabelLines(
  ctx: CanvasRenderingContext2D,
  stop: DayMapStop,
): LabelLine[] {
  const shown = stop.entries.slice(0, MAX_LABEL_ENTRIES);
  const lines: LabelLine[] = [];

  ctx.font = canvasFont(12, 'bold');
  for (const entry of shown) {
    const prefix = stop.entries.length > 1 ? `${entry.order} ` : '';
    lines.push({
      text: fitText(ctx, `${prefix}${entry.name}`, LABEL_MAX_TEXT_WIDTH),
      bold: true,
      height: NAME_LINE_HEIGHT,
    });
    if (entry.timeLabel) {
      lines.push({
        text: entry.timeLabel,
        bold: false,
        height: TIME_LINE_HEIGHT,
      });
    }
  }
  const hidden = stop.entries.length - shown.length;
  if (hidden > 0) {
    lines.push({
      text: `…另 ${hidden} 項`,
      bold: false,
      height: TIME_LINE_HEIGHT,
    });
  }
  return lines;
}

function measureLabel(
  ctx: CanvasRenderingContext2D,
  lines: LabelLine[],
): { width: number; height: number } {
  const textWidth = Math.max(
    ...lines.map(line => {
      ctx.font = canvasFont(line.bold ? 12 : 11, line.bold ? 'bold' : 'normal');
      return ctx.measureText(line.text).width;
    }),
  );
  return {
    width: Math.ceil(textWidth) + LABEL_PADDING_X * 2,
    height:
      lines.reduce((sum, line) => sum + line.height, 0) + LABEL_PADDING_Y * 2,
  };
}

function measureMarker(
  ctx: CanvasRenderingContext2D,
  stop: DayMapStop,
  position: { x: number; y: number },
): MarkerShape {
  ctx.font = canvasFont(12, 'bold');
  const width = Math.max(
    MARKER_RADIUS * 2,
    Math.ceil(ctx.measureText(stop.label).width) + MARKER_TEXT_PADDING * 2,
  );
  return {
    ...position,
    width,
    radius: Math.max(width / 2, MARKER_RADIUS),
    color: getStopColor(stop),
  };
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  { width, height }: MapProjection,
): void {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let x = GRID_STEP; x < width; x += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = GRID_STEP; y < height; y += GRID_STEP) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawRoute(
  ctx: CanvasRenderingContext2D,
  route: number[],
  markers: MarkerShape[],
): void {
  if (route.length < 2) {
    return;
  }
  ctx.strokeStyle = COLORS.route;
  ctx.lineWidth = ROUTE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  route.forEach((stopIndex, i) => {
    const { x, y } = markers[stopIndex];
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  marker: MarkerShape,
  text: string,
): void {
  const left = marker.x - marker.width / 2;
  const top = marker.y - MARKER_RADIUS;
  const height = MARKER_RADIUS * 2;
  ctx.fillStyle = marker.color;
  fillRoundRect(ctx, left, top, marker.width, height, MARKER_RADIUS);
  ctx.strokeStyle = COLORS.markerBorder;
  ctx.lineWidth = 2;
  strokeRoundRect(ctx, left, top, marker.width, height, MARKER_RADIUS);
  ctx.fillStyle = COLORS.markerText;
  ctx.font = canvasFont(12, 'bold');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, marker.x, marker.y + 0.5);
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  lines: LabelLine[],
  color: string,
): void {
  ctx.fillStyle = COLORS.labelFill;
  fillRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, LABEL_RADIUS);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  strokeRoundRect(ctx, rect.x, rect.y, rect.width, rect.height, LABEL_RADIUS);

  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let y = rect.y + LABEL_PADDING_Y;
  for (const line of lines) {
    ctx.font = canvasFont(line.bold ? 12 : 11, line.bold ? 'bold' : 'normal');
    ctx.fillText(line.text, rect.x + LABEL_PADDING_X, y + 1);
    y += line.height;
  }
}

/**
 * Draws one day's map picture in logical pixels (the caller applies any
 * pixel-ratio scaling beforehand): a light grid, the route, numbered markers
 * and a colored label with title and time range beside each marker.
 *
 * @param ctx - The 2D context to draw on.
 * @param model - The day's stops and route.
 * @param projection - Surface size and each stop's position, in stop order.
 */
export function drawDayMapImage(
  ctx: CanvasRenderingContext2D,
  model: DayMapModel,
  projection: MapProjection,
): void {
  drawBackground(ctx, projection);

  const markers = model.stops.map((stop, i) =>
    measureMarker(ctx, stop, projection.points[i]),
  );
  const labelLines = model.stops.map(stop => describeLabelLines(ctx, stop));
  const requests: LabelRequest[] = labelLines.map((lines, markerIndex) => ({
    markerIndex,
    ...measureLabel(ctx, lines),
  }));
  const rects = placeLabels(markers, requests, projection);

  drawRoute(ctx, model.route, markers);
  markers.forEach((marker, i) => drawMarker(ctx, marker, model.stops[i].label));
  rects.forEach((rect, i) =>
    drawLabel(ctx, rect, labelLines[i], markers[i].color),
  );
}
