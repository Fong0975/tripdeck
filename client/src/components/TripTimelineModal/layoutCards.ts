import type { TimelineBlock } from './buildDayTimeline';
import type { TimelineRange } from './timelineRange';

/** Vertical pixels per minute of the time axis (60px per hour). */
export const PX_PER_MINUTE = 1;
/** Height of an attraction card. */
export const CARD_HEIGHT = 44;
/** Height of a travel card. */
export const TRAVEL_CARD_HEIGHT = 38;
/** Vertical gap kept between stacked cards. */
export const CARD_GAP = 4;
/** Shortest height of a range bar, so very short stops stay visible. */
export const MIN_BAR_HEIGHT = 6;
/** Height of the marker drawn for a point block. */
export const POINT_MARKER_HEIGHT = 8;
/** Pixel width of one color-bar lane, including its gutter. */
export const LANE_WIDTH = 10;
/** Pixel width of a color bar within its lane. */
export const LANE_BAR_WIDTH = 6;

/**
 * Width of the lane track at the left of a day's time area: wide enough for
 * the day's busiest overlap group, so every card starts at the same offset.
 *
 * @param blocks - The day's blocks.
 */
export function getTrackWidth(blocks: { laneCount: number }[]): number {
  return Math.max(1, ...blocks.map(b => b.laneCount)) * LANE_WIDTH + 2;
}

/** A block together with its pixel geometry inside a day's time area. */
export interface PositionedBlock {
  block: TimelineBlock;
  barTop: number;
  barHeight: number;
  cardTop: number;
  cardHeight: number;
}

/** The positioned blocks of one day and the height the time area needs. */
export interface DayLayout {
  items: PositionedBlock[];
  height: number;
}

/**
 * Computes pixel geometry for a day's blocks. Bars sit exactly at their time;
 * cards start at the same offset but are pushed down when they would overlap
 * the previous card, so overlapping stops stay readable. When nothing is
 * interleaved, a card grows to fill its block's whole time span (up to the
 * next card); point markers keep the standard card height.
 *
 * @param blocks - The day's blocks, sorted by start time.
 * @param range - The shared visible hour range.
 * @returns The positioned blocks and the total height of the time area.
 */
export function layoutDay(
  blocks: TimelineBlock[],
  range: TimelineRange,
): DayLayout {
  const originMinute = range.startHour * 60;
  let cursor = 0;

  const items = blocks.map((block): PositionedBlock => {
    const barTop = (block.start - originMinute) * PX_PER_MINUTE;
    const barHeight =
      block.kind === 'point'
        ? POINT_MARKER_HEIGHT
        : Math.max(MIN_BAR_HEIGHT, (block.end - block.start) * PX_PER_MINUTE);
    const cardHeight =
      block.kind === 'travel' ? TRAVEL_CARD_HEIGHT : CARD_HEIGHT;
    const cardTop = Math.max(barTop, cursor);
    cursor = cardTop + cardHeight + CARD_GAP;
    return { block, barTop, barHeight, cardTop, cardHeight };
  });

  const stretched = items.map((item, i) => {
    if (item.block.kind === 'point') {
      return item;
    }
    // Fill the block's time span, but never into the next card.
    const next = items[i + 1];
    const limit = next ? next.cardTop - CARD_GAP : Infinity;
    const fillBottom = Math.min(item.barTop + item.barHeight, limit);
    return {
      ...item,
      cardHeight: Math.max(item.cardHeight, fillBottom - item.cardTop),
    };
  });

  const axisHeight = (range.endHour - range.startHour) * 60 * PX_PER_MINUTE;
  return { items: stretched, height: Math.max(axisHeight, cursor) };
}
