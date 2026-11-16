import { getTransportModeMeta } from '@/constants/transportModes';
import { formatDurationMinutes } from '@/utils/duration';

import type { TimelineBlock } from './buildDayTimeline';
import { formatTimeMinutes, parseTimeMinutes } from './parseTime';

/**
 * The time text shown on a block's card: `09:00–10:30` for a range or travel leg, the
 * time for a point (suffixed with 結束 when only the end time was set).
 *
 * @param block - The block to label.
 */
export function blockTimeLabel(block: TimelineBlock): string {
  if (block.kind === 'point') {
    const time = formatTimeMinutes(block.start);
    const hasStart = parseTimeMinutes(block.attraction.startTime) !== null;
    return hasStart ? time : `${time} 結束`;
  }
  return `${formatTimeMinutes(block.start)}–${formatTimeMinutes(block.end)}`;
}

/**
 * The text of a travel card: transport icon, mode label and duration.
 *
 * @param block - A travel block.
 */
export function travelLabel(
  block: Extract<TimelineBlock, { kind: 'travel' }>,
): string {
  const meta = getTransportModeMeta(block.connection.transportMode);
  return `${meta.icon} ${meta.label} ${formatDurationMinutes(block.end - block.start)}`;
}
