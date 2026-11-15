import { TRANSPORT_MODES, type TransportMode } from '@tripdeck/shared';

/** How a transport mode is displayed: an emoji icon and a short label. */
export interface TransportModeMeta {
  icon: string;
  label: string;
}

/**
 * Single source of truth for how each {@link TransportMode} is displayed
 * across the app (selection buttons, connection summaries, docx export).
 */
export const TRANSPORT_MODE_META: Record<TransportMode, TransportModeMeta> = {
  walk: { icon: '🚶', label: '步行' },
  transit: { icon: '🚇', label: '大眾運輸' },
  drive: { icon: '🚗', label: '開車' },
  bike: { icon: '🚲', label: '騎車' },
  taxi: { icon: '🚕', label: '計程車／Uber' },
  flight: { icon: '✈️', label: '飛機' },
  other: { icon: '🗺️', label: '其他' },
};

/** A selectable transport mode together with its display meta. */
export interface TransportModeOption extends TransportModeMeta {
  value: TransportMode;
}

/** Every transport mode, in the shared {@link TRANSPORT_MODES} order. */
export const TRANSPORT_MODE_OPTIONS = TRANSPORT_MODES.map(
  (value): TransportModeOption => ({ value, ...TRANSPORT_MODE_META[value] }),
);

/**
 * Looks up a connection's display meta, falling back to the "other" entry
 * when the mode is missing or unrecognised (legacy or imported data).
 *
 * @param mode - The connection's transport mode, possibly null.
 * @returns The icon and label to display.
 */
export function getTransportModeMeta(
  mode: TransportMode | null,
): TransportModeMeta {
  return mode !== null && (TRANSPORT_MODES as readonly string[]).includes(mode)
    ? TRANSPORT_MODE_META[mode]
    : TRANSPORT_MODE_META.other;
}
