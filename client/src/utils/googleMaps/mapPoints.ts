import type { Attraction, DayPlan } from '@/types';

/** One attraction that can be drawn on the map. */
export interface MapPoint {
  attractionId: number;
  dayId: number;
  /** 1-based position of the attraction within its day's itinerary. */
  order: number;
  name: string;
  lat: number;
  lng: number;
}

/** All attractions sharing one coordinate, drawn as a single marker. */
export interface MapMarkerGroup {
  /** Stable identity of the coordinate. */
  key: string;
  lat: number;
  lng: number;
  /** Whether the group contains an attraction of the selected day. */
  active: boolean;
  /** Itinerary positions to label an active marker with, ascending. */
  orders: number[];
  /** Distinct attraction names, in itinerary order. */
  names: string[];
}

/** Whether an attraction has usable coordinates (not unresolved or not found). */
export function hasCoordinates(
  attraction: Pick<Attraction, 'latitude' | 'longitude'>,
): boolean {
  return (
    typeof attraction.latitude === 'number' &&
    typeof attraction.longitude === 'number'
  );
}

/**
 * Flattens the days into the list of attractions that have coordinates, in
 * itinerary order. Numbering follows the full day so a missing location
 * leaves a visible gap in the sequence instead of renumbering the rest.
 */
export function buildMapPoints(days: DayPlan[]): MapPoint[] {
  return days.flatMap(day =>
    day.attractions.flatMap((attraction, index) =>
      hasCoordinates(attraction)
        ? [
            {
              attractionId: attraction.id,
              dayId: day.id,
              order: index + 1,
              name: attraction.name,
              lat: attraction.latitude as number,
              lng: attraction.longitude as number,
            },
          ]
        : [],
    ),
  );
}

/**
 * Merges points that share a coordinate (e.g. a hotel that starts and ends the
 * day) so overlapping markers cannot hide one another. A group touching the
 * selected day is active and only carries that day's positions; other days'
 * attractions at the same spot add nothing to the label.
 *
 * @param points - Every locatable attraction in the trip.
 * @param activeDayId - The day shown as selected.
 */
export function groupMapPoints(
  points: MapPoint[],
  activeDayId: number,
): MapMarkerGroup[] {
  const byCoordinate = new Map<string, MapPoint[]>();
  for (const point of points) {
    const key = `${point.lat},${point.lng}`;
    const members = byCoordinate.get(key);
    if (members) {
      members.push(point);
    } else {
      byCoordinate.set(key, [point]);
    }
  }

  return [...byCoordinate].map(([key, members]) => {
    const activeMembers = members.filter(point => point.dayId === activeDayId);
    const shown = activeMembers.length > 0 ? activeMembers : members;
    return {
      key,
      lat: members[0].lat,
      lng: members[0].lng,
      active: activeMembers.length > 0,
      orders: shown.map(point => point.order),
      names: [...new Set(shown.map(point => point.name))],
    };
  });
}
