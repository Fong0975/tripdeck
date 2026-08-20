import type { TransportMode } from '@/types';

/**
 * Single source of truth for how each {@link TransportMode} is displayed
 * across the app (selection buttons, connection summaries, docx export).
 */
export const TRANSPORT_MODE_META: Record<
  TransportMode,
  { icon: string; label: string }
> = {
  walk: { icon: '🚶', label: '步行' },
  transit: { icon: '🚇', label: '大眾運輸' },
  drive: { icon: '🚗', label: '開車' },
  bike: { icon: '🚲', label: '騎車' },
  taxi: { icon: '🚕', label: '計程車／Uber' },
  flight: { icon: '✈️', label: '飛機' },
  other: { icon: '🗺️', label: '其他' },
};

export const TRANSPORT_MODE_OPTIONS: {
  value: TransportMode;
  label: string;
  icon: string;
}[] = (Object.keys(TRANSPORT_MODE_META) as TransportMode[]).map(value => ({
  value,
  ...TRANSPORT_MODE_META[value],
}));
