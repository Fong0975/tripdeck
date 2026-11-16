import { formatDayDate } from '@/utils/dayLabel';
import { travelLabel, blockTimeLabel } from '@/utils/timeline/blockLabel';
import {
  LANE_BAR_WIDTH,
  LANE_WIDTH,
  PX_PER_MINUTE,
  getTrackWidth,
} from '@/utils/timeline/layoutCards';
import { formatTimeMinutes } from '@/utils/timeline/parseTime';
import { getBlockColor } from '@/utils/timeline/timelinePalette';

import {
  AXIS_WIDTH,
  DAY_WIDTH,
  HEADER_HEIGHT,
  UNSCHEDULED_PADDING,
  UNSCHEDULED_ROW_HEIGHT,
  type TimelineImagePlan,
} from './timelineImageLayout';

/** Fixed light palette, so the exported picture reads well on a white page. */
const COLORS = {
  background: '#ffffff',
  text: '#111827',
  muted: '#6b7280',
  line: '#e5e7eb',
  grid: '#f0f1f3',
  travelBar: 'rgba(17, 24, 39, 0.6)',
  travelFill: '#f3f4f6',
  travelTint: 'rgba(17, 24, 39, 0.15)',
  travelText: '#374151',
} as const;

const FONT_STACK = `'Microsoft JhengHei', 'PingFang TC', 'Noto Sans TC', sans-serif`;
const CARD_RADIUS = 5;
const CARD_ACCENT_WIDTH = 4;
const GUTTER = 4;

function font(size: number, weight: 'normal' | 'bold' = 'normal'): string {
  return `${weight} ${size}px ${FONT_STACK}`;
}

/**
 * Shortens text with an ellipsis so it fits a pixel width.
 *
 * @param ctx - The context whose current font is used to measure.
 * @param text - The text to fit.
 * @param maxWidth - Available width in logical pixels.
 */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let end = text.length;
  while (
    end > 0 &&
    ctx.measureText(`${text.slice(0, end)}…`).width > maxWidth
  ) {
    end -= 1;
  }
  return end > 0 ? `${text.slice(0, end)}…` : '…';
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function drawHeaders(
  ctx: CanvasRenderingContext2D,
  plan: TimelineImagePlan,
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  plan.timelines.forEach(({ day }, i) => {
    const centerX = AXIS_WIDTH + i * DAY_WIDTH + DAY_WIDTH / 2;
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(11);
    ctx.fillText(formatDayDate(day.date, 'M/d (EEE)'), centerX, 6);
    ctx.fillStyle = COLORS.text;
    ctx.font = font(16, 'bold');
    ctx.fillText(`Day ${day.day}`, centerX, 21);
  });

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HEADER_HEIGHT);
  ctx.lineTo(plan.width, HEADER_HEIGHT);
  ctx.stroke();
}

function drawUnscheduled(
  ctx: CanvasRenderingContext2D,
  plan: TimelineImagePlan,
): void {
  if (plan.unscheduledHeight === 0) {
    return;
  }
  ctx.textBaseline = 'top';
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.muted;
  ctx.font = font(11);
  ctx.fillText(
    '未排時間',
    AXIS_WIDTH - 6,
    HEADER_HEIGHT + UNSCHEDULED_PADDING + 4,
  );

  plan.timelines.forEach(({ unscheduled }, i) => {
    const x = AXIS_WIDTH + i * DAY_WIDTH + GUTTER;
    const width = DAY_WIDTH - GUTTER * 2;
    unscheduled.forEach((attraction, row) => {
      const y =
        HEADER_HEIGHT + UNSCHEDULED_PADDING + row * UNSCHEDULED_ROW_HEIGHT;
      ctx.fillStyle = COLORS.travelFill;
      fillRoundRect(ctx, x, y, width, UNSCHEDULED_ROW_HEIGHT - 4, CARD_RADIUS);
      ctx.fillStyle = COLORS.text;
      ctx.font = font(12);
      ctx.textAlign = 'left';
      ctx.fillText(fitText(ctx, attraction.name, width - 12), x + 6, y + 3);
    });
  });

  const bottom = HEADER_HEIGHT + plan.unscheduledHeight;
  ctx.strokeStyle = COLORS.line;
  ctx.beginPath();
  ctx.moveTo(0, bottom);
  ctx.lineTo(plan.width, bottom);
  ctx.stroke();
}

function drawAxisAndGrid(
  ctx: CanvasRenderingContext2D,
  plan: TimelineImagePlan,
  top: number,
): void {
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  for (let hour = plan.range.startHour; hour < plan.range.endHour; hour += 1) {
    const y = top + (hour - plan.range.startHour) * 60 * PX_PER_MINUTE;
    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath();
    ctx.moveTo(AXIS_WIDTH, y);
    ctx.lineTo(plan.width, y);
    ctx.stroke();
    ctx.fillStyle = COLORS.muted;
    ctx.font = font(11);
    ctx.fillText(formatTimeMinutes(hour * 60), AXIS_WIDTH - 6, y + 2);
  }

  ctx.strokeStyle = COLORS.line;
  plan.timelines.forEach((_, i) => {
    const x = AXIS_WIDTH + i * DAY_WIDTH;
    ctx.beginPath();
    ctx.moveTo(x, HEADER_HEIGHT);
    ctx.lineTo(x, plan.height);
    ctx.stroke();
  });
}

function drawDayBlocks(
  ctx: CanvasRenderingContext2D,
  plan: TimelineImagePlan,
  dayIndex: number,
  top: number,
): void {
  const { blocks } = plan.timelines[dayIndex];
  const x0 = AXIS_WIDTH + dayIndex * DAY_WIDTH + GUTTER;
  const trackWidth = getTrackWidth(blocks);
  const cardX = x0 + trackWidth + GUTTER;
  const cardWidth = AXIS_WIDTH + (dayIndex + 1) * DAY_WIDTH - GUTTER - cardX;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  plan.layouts[dayIndex].items.forEach(
    ({ block, barTop, barHeight, cardTop, cardHeight }) => {
      const color =
        block.kind === 'travel' ? null : getBlockColor(block.colorIndex);
      ctx.fillStyle = color?.solid ?? COLORS.travelBar;
      fillRoundRect(
        ctx,
        x0 + block.lane * LANE_WIDTH,
        top + barTop,
        LANE_BAR_WIDTH,
        barHeight,
        LANE_BAR_WIDTH / 2,
      );

      const y = top + cardTop;
      if (block.kind === 'travel') {
        ctx.fillStyle = COLORS.travelTint;
        fillRoundRect(ctx, cardX, y, cardWidth, cardHeight, CARD_RADIUS);
        ctx.fillStyle = COLORS.travelBar;
        ctx.fillRect(cardX, y, CARD_ACCENT_WIDTH, cardHeight);
        ctx.fillStyle = COLORS.travelText;
        ctx.font = font(11);
        const textX = cardX + CARD_ACCENT_WIDTH + 6;
        const textWidth = cardWidth - CARD_ACCENT_WIDTH - 12;
        ctx.fillText(fitText(ctx, travelLabel(block), textWidth), textX, y + 5);
        ctx.fillStyle = COLORS.muted;
        ctx.fillText(
          fitText(ctx, blockTimeLabel(block), textWidth),
          textX,
          y + 20,
        );
        return;
      }

      ctx.fillStyle = color?.tint ?? COLORS.travelFill;
      fillRoundRect(ctx, cardX, y, cardWidth, cardHeight, CARD_RADIUS);
      ctx.fillStyle = color?.solid ?? COLORS.travelBar;
      ctx.fillRect(cardX, y, CARD_ACCENT_WIDTH, cardHeight);

      const textX = cardX + CARD_ACCENT_WIDTH + 6;
      const textWidth = cardWidth - CARD_ACCENT_WIDTH - 12;
      ctx.fillStyle = COLORS.text;
      ctx.font = font(13, 'bold');
      ctx.fillText(
        fitText(ctx, block.attraction.name, textWidth),
        textX,
        y + 6,
      );
      ctx.fillStyle = COLORS.muted;
      ctx.font = font(11);
      ctx.fillText(
        fitText(ctx, blockTimeLabel(block), textWidth),
        textX,
        y + 25,
      );
    },
  );
}

/**
 * Draws one planned timeline image onto a canvas context in logical pixels
 * (the caller applies any pixel-ratio scaling beforehand).
 *
 * @param ctx - The 2D context to draw on.
 * @param plan - The image plan from `planTimelineImages`.
 */
export function drawTimelineImage(
  ctx: CanvasRenderingContext2D,
  plan: TimelineImagePlan,
): void {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, plan.width, plan.height);

  const top = HEADER_HEIGHT + plan.unscheduledHeight;
  drawHeaders(ctx, plan);
  drawUnscheduled(ctx, plan);
  drawAxisAndGrid(ctx, plan, top);
  plan.timelines.forEach((_, i) => drawDayBlocks(ctx, plan, i, top));
}
