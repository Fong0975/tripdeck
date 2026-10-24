import { loadGoogleMaps } from './loader';
import type {
  AdvancedMarkerInstance,
  MapInstance,
  MapLibraries,
} from './types';

// Advanced markers need a map ID; Google's demo ID works without any setup.
const MAP_ID = 'DEMO_MAP_ID';
const WORLD_VIEW = { lat: 20, lng: 0 };

/** A live map plus the markers currently drawn on it. */
export interface MapSession {
  libs: MapLibraries;
  map: MapInstance;
  container: HTMLElement;
  /** Markers by attraction id, with the signature they were last drawn with. */
  markers: Map<number, { marker: AdvancedMarkerInstance; signature: string }>;
}

let sessionPromise: Promise<MapSession> | null = null;

async function createSession(host: HTMLElement): Promise<MapSession> {
  const libs = await loadGoogleMaps();
  const container = document.createElement('div');
  container.className = 'size-full';
  host.appendChild(container);
  const map = new libs.maps.Map(container, {
    mapId: MAP_ID,
    center: WORLD_VIEW,
    zoom: 2,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  });
  return { libs, map, container, markers: new Map() };
}

/**
 * Puts the map inside `host`, creating it on first use. Every map
 * initialisation is billed, so the map and its container are created once per
 * page session and simply re-parented each time the modal opens.
 */
export async function attachMapSession(host: HTMLElement): Promise<MapSession> {
  sessionPromise ??= createSession(host).catch((err: unknown) => {
    sessionPromise = null;
    throw err;
  });
  const session = await sessionPromise;
  if (!host.contains(session.container)) {
    host.appendChild(session.container);
  }
  return session;
}

/** Detaches the map from the page (keeping it alive for the next attach). */
export function detachMapSession(): void {
  void sessionPromise?.then(
    session => session.container.remove(),
    () => undefined,
  );
}

/** Test-only: forgets the session so each test creates a fresh map. */
export function __resetMapSessionForTests(): void {
  sessionPromise = null;
}
