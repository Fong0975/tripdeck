import type { MapPoint } from './mapPoints';
import type { MapSession } from './mapSession';
import { createPinElement, type PinVariant } from './markerPin';

const SINGLE_POINT_ZOOM = 15;
const FIT_PADDING_PX = 64;

function signatureOf(point: MapPoint, variant: PinVariant): string {
  return [variant, point.lat, point.lng, point.order, point.name].join('|');
}

function fitView(session: MapSession, points: MapPoint[]): void {
  if (points.length === 0) {
    return;
  }
  if (points.length === 1) {
    session.map.setCenter({ lat: points[0].lat, lng: points[0].lng });
    session.map.setZoom(SINGLE_POINT_ZOOM);
    return;
  }
  const bounds = new session.libs.maps.LatLngBounds();
  points.forEach(point => bounds.extend({ lat: point.lat, lng: point.lng }));
  session.map.fitBounds(bounds, FIT_PADDING_PX);
}

/**
 * Brings the map's markers in line with `points`: the selected day's
 * attractions as normal-size coloured numbered pins, every other day's as
 * small grey dots. Only markers whose look or position changed are rebuilt,
 * stale ones are removed, and the view is fitted to the selected day (or to
 * everything when that day has nothing locatable).
 *
 * @param session - The live map.
 * @param points - Every locatable attraction in the trip.
 * @param activeDayId - The day shown as selected.
 */
export function applyMarkers(
  session: MapSession,
  points: MapPoint[],
  activeDayId: number,
): void {
  const wanted = new Set(points.map(point => point.attractionId));
  for (const [id, entry] of session.markers) {
    if (!wanted.has(id)) {
      entry.marker.map = null;
      session.markers.delete(id);
    }
  }

  for (const point of points) {
    const variant: PinVariant =
      point.dayId === activeDayId ? 'active' : 'inactive';
    const signature = signatureOf(point, variant);
    const existing = session.markers.get(point.attractionId);
    if (existing?.signature === signature) {
      continue;
    }
    if (existing) {
      existing.marker.map = null;
    }
    const marker = new session.libs.marker.AdvancedMarkerElement({
      map: session.map,
      position: { lat: point.lat, lng: point.lng },
      content: createPinElement(variant, String(point.order)),
      title: point.name,
      zIndex: variant === 'active' ? 2 : 1,
    });
    session.markers.set(point.attractionId, { marker, signature });
  }

  const activePoints = points.filter(point => point.dayId === activeDayId);
  fitView(session, activePoints.length > 0 ? activePoints : points);
}
