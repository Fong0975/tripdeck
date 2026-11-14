import { INPUT_CLS } from '@/components/formStyles';

interface Props {
  /** Total duration in minutes. */
  value: number;
  /** Receives the new total duration in minutes. */
  onChange: (totalMinutes: number) => void;
  label?: string;
}

/** Coerces raw input text to a non-negative number, treating blanks and garbage as 0. */
function toNonNegative(raw: string): number {
  return Math.max(0, Number(raw) || 0);
}

/**
 * Labelled hour + minute number inputs bound to a single total-minutes value.
 * Minutes are clamped to 0–59 so the two fields always describe one duration.
 *
 * @param props.value - Current total duration in minutes.
 * @param props.onChange - Called with the recomputed total on every edit.
 * @param props.label - Field label; defaults to「所需時間」.
 */
export default function DurationInput({
  value,
  onChange,
  label = '所需時間',
}: Props) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return (
    <div>
      <label className='mb-1.5 block text-sm font-medium text-foreground'>
        {label}
      </label>
      <div className='flex items-center gap-2'>
        <input
          type='number'
          inputMode='numeric'
          min={0}
          value={hours}
          onChange={e => onChange(toNonNegative(e.target.value) * 60 + minutes)}
          className={INPUT_CLS}
        />
        <span className='shrink-0 text-sm text-muted-foreground'>小時</span>
        <input
          type='number'
          inputMode='numeric'
          min={0}
          max={59}
          value={minutes}
          onChange={e =>
            onChange(hours * 60 + Math.min(59, toNonNegative(e.target.value)))
          }
          className={INPUT_CLS}
        />
        <span className='shrink-0 text-sm text-muted-foreground'>分鐘</span>
      </div>
    </div>
  );
}
