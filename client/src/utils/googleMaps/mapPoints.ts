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
