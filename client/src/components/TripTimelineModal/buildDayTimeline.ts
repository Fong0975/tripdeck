import type { Attraction, DayPlan, TravelConnection } from '@/types';
import { parseDurationMinutes } from '@/utils/duration';

import { MINUTES_PER_DAY, parseTimeMinutes } from './parseTime';

/**
 * Minimum span, in minutes, a block occupies when laying out lanes and the
 * visible range. Keeps point markers from colliding with their neighbours.
 */
export const MIN_BLOCK_SPAN_MINUTES = 30;

/** Number of distinct colors blocks cycle through. */
export const TIMELINE_PALETTE_SIZE = 8;

interface BlockBase {
  /** Stable React key, unique within a day. */
  key: string;
  /** Start in minutes since midnight; for a point, the marked time. */
  start: number;
  /** End in minutes since midnight; equals `start` for a point. */
  end: number;
  /** Zero-based lane index within the block's overlap group. */
  lane: number;
  /** Number of lanes used by the block's overlap group. */
  laneCount: number;
}

/** An attraction with both a valid start and a later end time. */
export interface RangeBlock extends BlockBase {
  kind: 'range';
  attraction: Attraction;
  /** Index into the color palette. */
  colorIndex: number;
}

/** An attraction with a single usable time, drawn as a marker. */
export interface PointBlock extends BlockBase {
  kind: 'point';
  attraction: Attraction;
  /** Index into the color palette. */
  colorIndex: number;
}

/** A travel leg whose time span could be derived from its neighbours. */
export interface TravelBlock extends BlockBase {
  kind: 'travel';
  connection: TravelConnection;
}

export type TimelineBlock = RangeBlock | PointBlock | TravelBlock;

/** The timeline content of one day. */
export interface DayTimeline {
  day: DayPlan;
  /** Attractions without any usable time, in their original order. */
  unscheduled: Attraction[];
  /** Scheduled blocks, sorted by start time. */
  blocks: TimelineBlock[];
}

type RawBlock =
  | Omit<RangeBlock, 'lane' | 'laneCount' | 'colorIndex'>
  | Omit<PointBlock, 'lane' | 'laneCount' | 'colorIndex'>
  | Omit<TravelBlock, 'lane' | 'laneCount'>;

/** The end used for overlap and range calculations. */
export function occupiedEnd(block: Pick<BlockBase, 'start' | 'end'>): number {
  return Math.max(block.end, block.start + MIN_BLOCK_SPAN_MINUTES);
}

function buildAttractionBlock(attraction: Attraction): RawBlock | null {
  const start = parseTimeMinutes(attraction.startTime);
  const end = parseTimeMinutes(attraction.endTime);
  if (start === null && end === null) {
    return null;
  }
  const key = `attraction-${attraction.id}`;
  if (start !== null && end !== null && end > start) {
    return { kind: 'range', key, attraction, start, end };
  }
  const at = start ?? end ?? 0;
  return { kind: 'point', key, attraction, start: at, end: at };
}

/**
 * Derives the time span of a travel leg. It starts when the previous
 * attraction ends; failing that, it ends when the next one starts. Returns
 * null when the duration is unusable or no anchor time exists.
 */
function buildTravelBlock(
  connection: TravelConnection,
  attractions: Attraction[],
): RawBlock | null {
  const duration = parseDurationMinutes(connection.duration);
  if (duration === null || duration <= 0) {
    return null;
  }
  const from = attractions.find(a => a.id === connection.fromAttractionId);
  const to = attractions.find(a => a.id === connection.toAttractionId);
  const fromEnd = parseTimeMinutes(from?.endTime);
  const toStart = parseTimeMinutes(to?.startTime);

  let start: number;
  if (fromEnd !== null) {
    start = fromEnd;
  } else if (toStart !== null) {
    start = toStart - duration;
  } else {
    return null;
  }
  const end = start + duration;
  if (start < 0 || end > MINUTES_PER_DAY) {
    return null;
  }
  return {
    kind: 'travel',
    key: `travel-${connection.id}`,
    connection,
    start,
    end,
  };
}

/**
 * Assigns lanes greedily in start order. A new overlap group begins whenever
 * a block starts after every lane of the previous group has been freed.
 */
function assignLanes(raw: RawBlock[]): TimelineBlock[] {
  const sorted = [...raw].sort(
    (a, b) => a.start - b.start || occupiedEnd(b) - occupiedEnd(a),
  );
  const result: TimelineBlock[] = [];
  let laneEnds: number[] = [];
  let groupStartIndex = 0;
  let paletteCursor = 0;

  const closeGroup = () => {
    for (let i = groupStartIndex; i < result.length; i += 1) {
      result[i].laneCount = laneEnds.length;
    }
  };

  sorted.forEach(block => {
    if (laneEnds.length > 0 && laneEnds.every(end => end <= block.start)) {
      closeGroup();
      laneEnds = [];
      groupStartIndex = result.length;
    }
    let lane = laneEnds.findIndex(end => end <= block.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = occupiedEnd(block);

    const placed =
      block.kind === 'travel'
        ? { ...block, lane, laneCount: 1 }
        : {
            ...block,
            lane,
            laneCount: 1,
            colorIndex: paletteCursor % TIMELINE_PALETTE_SIZE,
          };
    if (block.kind !== 'travel') {
      paletteCursor += 1;
    }
    result.push(placed);
  });
  closeGroup();
  return result;
}

/**
 * Lays out one day for the timeline: separates attractions with no usable
 * time, derives point/range/travel blocks and assigns overlap lanes.
 *
 * @param day - The day plan to lay out.
 * @returns The unscheduled attractions and the positioned blocks.
 */
export function buildDayTimeline(day: DayPlan): DayTimeline {
  const unscheduled: Attraction[] = [];
  const raw: RawBlock[] = [];

  day.attractions.forEach(attraction => {
    const block = buildAttractionBlock(attraction);
    if (block) {
      raw.push(block);
    } else {
      unscheduled.push(attraction);
    }
  });
  day.connections.forEach(connection => {
    const block = buildTravelBlock(connection, day.attractions);
    if (block) {
      raw.push(block);
    }
  });

  return { day, unscheduled, blocks: assignLanes(raw) };
}
