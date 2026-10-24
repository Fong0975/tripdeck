import type { MapPoint } from './mapPoints';
import type { MapSession } from './mapSession';

const ROUTE_COLOR = '#2563eb';
const ROUTE_OPACITY = 0.85;
const ROUTE_WEIGHT_PX = 5;
// Below the markers (which start at 1) so pins stay readable on top of the line.
const ROUTE_Z_INDEX = 0;

/**
 * Draws one line through the selected day's attractions in itinerary order,
 * or clears it when fewer than two of them are located. Points sharing a
 * coordinate are kept, so a day that ends where it started loops back.
 * The existing line is updated in place instead of being rebuilt.
 *
 * @param session - The live map.
 * @param points - Every locatable attraction in the trip.
 * @param activeDayId - The day shown as selected.
 */
export function applyRoute(
  session: MapSession,
  points: MapPoint[],
  activeDayId: number,
): void {
  const path = points
    .filter(point => point.dayId === activeDayId)
    .sort((a, b) => a.order - b.order)
    .map(point => ({ lat: point.lat, lng: point.lng }));

  if (path.length < 2) {
    session.route?.setMap(null);
    session.route = null;
    return;
  }

  if (session.route) {
    session.route.setPath(path);
    return;
  }
  session.route = new session.libs.maps.Polyline({
    map: session.map,
    path,
    strokeColor: ROUTE_COLOR,
    strokeOpacity: ROUTE_OPACITY,
    strokeWeight: ROUTE_WEIGHT_PX,
    zIndex: ROUTE_Z_INDEX,
  });
}
