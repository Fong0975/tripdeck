import { getMapsStatus, type MapsStatus } from '@/api/maps';

/**
 * What the day map button should do: hidden (`unavailable`: not configured,
 * still loading, or the status request failed), usable (`ready`), or shown
 * disabled with a hint (`exhausted`).
 */
export type MapsAvailability =
  | { state: 'unavailable' }
  | { state: 'ready' }
  | { state: 'exhausted'; resetAt: string | null };

let _status: Promise<MapsStatus | null> | null = null;
const _listeners = new Set<() => void>();

/**
 * Resolves the backend's map status. It is fetched once per page load and
 * shared by every caller; a failed request resolves to null.
 */
export function getMapsStatusOnce(): Promise<MapsStatus | null> {
  _status ??= getMapsStatus().catch(() => null);
  return _status;
}

/**
 * Records that today's map quota is used up (a 429 for the key, or Google
 * rejecting it) and notifies subscribers so every day's map button disables
 * without a reload.
 */
export function markMapsExhausted(resetAt: string | null): void {
  _status = Promise.resolve({
    enabled: true,
    exhausted: true,
    geocodeExhausted: true,
    resetAt,
  });
  _listeners.forEach(listener => listener());
}

/** Calls `listener` whenever the status is changed by {@link markMapsExhausted}. */
export function subscribeMapsStatus(listener: () => void): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

/** Maps a backend status (or null on failure) to the button's availability. */
export function toMapsAvailability(
  status: MapsStatus | null,
): MapsAvailability {
  if (!status?.enabled) {
    return { state: 'unavailable' };
  }
  return status.exhausted
    ? { state: 'exhausted', resetAt: status.resetAt }
    : { state: 'ready' };
}

/** Test-only: forgets the memoized status and subscribers so each test starts clean. */
export function __resetMapsApiForTests(): void {
  _status = null;
  _listeners.clear();
}
