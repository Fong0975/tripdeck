/**
 * Transport modes a connection may use. Must stay in sync with the keys of
 * `TRANSPORT_MODE_META` in `client/src/constants/transportModes.ts`.
 */
export const TRANSPORT_MODES = [
  'walk',
  'transit',
  'drive',
  'bike',
  'taxi',
  'flight',
  'other',
] as const;

export type TransportMode = (typeof TRANSPORT_MODES)[number];

/**
 * Checks whether a value is one of the supported {@link TRANSPORT_MODES}.
 *
 * @param value - Raw value, typically taken from a request body.
 * @returns True when `value` is a known transport mode string.
 */
export function isTransportMode(value: unknown): value is TransportMode {
  return (
    typeof value === 'string' &&
    (TRANSPORT_MODES as readonly string[]).includes(value)
  );
}
