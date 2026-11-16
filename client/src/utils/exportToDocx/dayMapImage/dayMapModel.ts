import type { DayPlan } from '@/types';
import { buildMapPoints } from '@/utils/googleMaps/mapPoints';
import {
  formatTimeMinutes,
  parseTimeMinutes,
} from '@/utils/timeline/parseTime';

import type { GeoCoordinate } from './mapProjection';

/** One attraction shown at a map stop. */
export interface DayMapEntry {
  /** 1-based position of the attraction within the day's itinerary. */
  order: number;
  name: string;
  /** Normalized time range text, or null when the attraction has no time. */
  timeLabel: string | null;
}

/** A marker on the map: every attraction of the day at one coordinate. */
export interface DayMapStop extends GeoCoordinate {
  /** Marker text, e.g. `3` or `1·5` when a spot is visited twice. */
  label: string;
  /** Attractions at this spot, in itinerary order. */
  entries: DayMapEntry[];
}

/** What a day's map picture shows. */
export interface DayMapModel {
  stops: DayMapStop[];
  /** Stop indices in visiting order; consecutive repeats are collapsed. */
  route: number[];
}

/**
 * Formats an attraction's time range for a map label.
 *
 * @param startTime - Raw start time or null.
 * @param endTime - Raw end time or null.
 * @returns `HH:mm–HH:mm`, `HH:mm`, `HH:mm 結束`, or null when neither parses.
 */
export function formatMapTimeRange(
  startTime: string | null,
  endTime: string | null,
): string | null {
  const start = parseTimeMinutes(startTime);
  const end = parseTimeMinutes(endTime);
  if (start !== null && end !== null) {
    return `${formatTimeMinutes(start)}–${formatTimeMinutes(end)}`;
  }
  if (start !== null) {
    return formatTimeMinutes(start);
  }
  return end !== null ? `${formatTimeMinutes(end)} 結束` : null;
}

/**
 * Builds the map content of one day: only that day's locatable attractions.
 * Numbering follows the full itinerary, so an attraction without coordinates
 * leaves a gap instead of renumbering the others, as on the trip detail map.
 * Attractions sharing a coordinate merge into one stop.
 *
 * @param day - The day to draw.
 */
export function buildDayMapModel(day: DayPlan): DayMapModel {
  const attractionById = new Map(day.attractions.map(a => [a.id, a]));
  const stops: DayMapStop[] = [];
  const stopByCoordinate = new Map<string, number>();
  const route: number[] = [];

  for (const point of buildMapPoints([day])) {
    const attraction = attractionById.get(point.attractionId);
    const entry: DayMapEntry = {
      order: point.order,
      name: point.name,
      timeLabel: formatMapTimeRange(
        attraction?.startTime ?? null,
        attraction?.endTime ?? null,
      ),
    };

    const key = `${point.lat},${point.lng}`;
    let index = stopByCoordinate.get(key);
    if (index === undefined) {
      index = stops.length;
      stopByCoordinate.set(key, index);
      stops.push({ lat: point.lat, lng: point.lng, label: '', entries: [] });
    }
    stops[index].entries.push(entry);

    if (route[route.length - 1] !== index) {
      route.push(index);
    }
  }

  for (const stop of stops) {
    stop.label = stop.entries.map(entry => entry.order).join('·');
  }
  return { stops, route };
}
