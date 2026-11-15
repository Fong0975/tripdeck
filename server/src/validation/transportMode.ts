import { TRANSPORT_MODES, type TransportMode } from '@tripdeck/shared';

/**
 * Checks whether a value is one of the supported {@link TRANSPORT_MODES}.
 *
 * @param value - Raw value, typically taken from a request body or a DB row.
 * @returns True when `value` is a known transport mode string.
 */
export function isTransportMode(value: unknown): value is TransportMode {
  return (
    typeof value === 'string' &&
    (TRANSPORT_MODES as readonly string[]).includes(value)
  );
}
