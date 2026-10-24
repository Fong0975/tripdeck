import { format, isValid, parseISO } from 'date-fns';
import { Map as MapIcon } from 'lucide-react';

import type { MapsAvailability } from '@/utils/mapsApi';

interface Props {
  availability: MapsAvailability;
  onClick: () => void;
}

const LABEL = '檢視當日地圖';
const EXHAUSTED_BASE = '今日地圖額度已用完';

function exhaustedTooltip(resetAt: string | null): string {
  const resetDate = resetAt ? parseISO(resetAt) : null;
  return resetDate && isValid(resetDate)
    ? `${EXHAUSTED_BASE}，將於 ${format(resetDate, 'M/d HH:mm')} 重置`
    : `${EXHAUSTED_BASE}，請明天再試`;
}

/**
 * Map icon button shown next to a day's notes-edit button. Hidden while the
 * feature is unavailable. Once today's quota is used up it stays visible but
 * inert, explaining why in its tooltip; `aria-disabled` is used instead of
 * `disabled` so the tooltip still shows and the button stays focusable.
 */
export default function DayMapButton({ availability, onClick }: Props) {
  if (availability.state === 'unavailable') {
    return null;
  }

  const exhausted = availability.state === 'exhausted';
  return (
    <button
      type='button'
      onClick={exhausted ? undefined : onClick}
      aria-label={LABEL}
      aria-disabled={exhausted}
      title={exhausted ? exhaustedTooltip(availability.resetAt) : LABEL}
      className={`flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors ${
        exhausted
          ? 'cursor-not-allowed opacity-50'
          : 'hover:bg-accent hover:text-foreground'
      }`}
    >
      <MapIcon size={14} />
    </button>
  );
}
