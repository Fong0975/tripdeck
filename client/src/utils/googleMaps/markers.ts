import {
  groupMapPoints,
  type MapMarkerGroup,
  type MapPoint,
} from './mapPoints';
import type { MapSession } from './mapSession';
import { createPinElement, type PinVariant } from './markerPin';

const SINGLE_POINT_ZOOM = 15;
const FIT_PADDING_PX = 64;

const ORDER_SEPARATOR = '·';
const NAME_SEPARATOR = ' / ';

function signatureOf(
  group: MapMarkerGroup,
  variant: PinVariant,
  label: string,
  title: string,
): string {
  return [variant, group.lat, group.lng, label, title].join('|');
}

function fitView(session: MapSession, points: MapMarkerGroup[]): void {
  if (points.length === 0) {
    return;
  }
  if (points.length === 1) {
    session.map.setCenter({ lat: points[0].lat, lng: points[0].lng });
    session.map.setZoom(SINGLE_POINT_ZOOM);
    return;
  }
  const lats = points.map(point => point.lat);
  const lngs = points.map(point => point.lng);
  session.map.fitBounds(
    {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    },
    FIT_PADDING_PX,
  );
}

/**
 * Brings the map's markers in line with `points`: the selected day's
 * attractions as normal-size coloured numbered pins, every other day's as
 * small grey dots. Attractions sharing a coordinate (e.g. a hotel at both ends
 * of the day) share one marker labelled with every position, so none is
 * hidden underneath another. Only markers whose look or position changed are
 * rebuilt, stale ones are removed, and the view is fitted to the selected day
 * (or to everything when that day has nothing locatable).
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
  const groups = groupMapPoints(points, activeDayId);
  const wanted = new Set(groups.map(group => group.key));
  for (const [key, entry] of session.markers) {
    if (!wanted.has(key)) {
      entry.marker.map = null;
      session.markers.delete(key);
    }
  }

  for (const group of groups) {
    const variant: PinVariant = group.active ? 'active' : 'inactive';
    const label = group.orders.join(ORDER_SEPARATOR);
    const title = group.names.join(NAME_SEPARATOR);
    const signature = signatureOf(group, variant, label, title);
    const existing = session.markers.get(group.key);
    if (existing?.signature === signature) {
      continue;
    }
    if (existing) {
      existing.marker.map = null;
    }
    const marker = new session.libs.marker.AdvancedMarkerElement({
      map: session.map,
      position: { lat: group.lat, lng: group.lng },
      content: createPinElement(variant, label),
      title,
      zIndex: group.active ? 2 : 1,
    });
    session.markers.set(group.key, { marker, signature });
  }

  const activeGroups = groups.filter(group => group.active);
  fitView(session, activeGroups.length > 0 ? activeGroups : groups);
}
