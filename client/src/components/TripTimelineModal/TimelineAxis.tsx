import { PX_PER_MINUTE } from './layoutCards';
import { formatTimeMinutes } from './parseTime';
import type { TimelineRange } from './timelineRange';

interface Props {
  range: TimelineRange;
}

/** The hour labels down the left side of the timeline. */
export default function TimelineAxis({ range }: Props) {
  const hours = Array.from(
    { length: range.endHour - range.startHour },
    (_, i) => range.startHour + i,
  );
  return (
    <div aria-hidden='true'>
      {hours.map(hour => (
        <div
          key={hour}
          style={{ height: 60 * PX_PER_MINUTE }}
          className='pr-2 text-right text-xs text-muted-foreground'
        >
          {formatTimeMinutes(hour * 60)}
        </div>
      ))}
    </div>
  );
}
