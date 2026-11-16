import { Package } from 'lucide-react';

import {
  STORAGE_OPTIONS,
  hasStorageOption,
  toggleStorageOption,
} from './checklistUtils';

interface Props {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  compact?: boolean;
  /** Larger icon, checkbox and label for roomy editors; takes precedence over `compact`. */
  large?: boolean;
}

export default function StorageCheckboxes({
  value,
  onChange,
  compact = false,
  large = false,
}: Props) {
  /* v8 ignore start -- size variants are purely cosmetic */
  const iconSize = large ? 14 : compact ? 10 : 12;
  const checkboxSize = large ? 'size-4' : compact ? 'size-3' : 'size-3.5';
  const labelSize = large ? 'text-sm' : 'text-xs';
  /* v8 ignore stop */

  return (
    <>
      <Package size={iconSize} className='shrink-0 text-muted-foreground' />
      {STORAGE_OPTIONS.map(option => (
        <label key={option} className='flex cursor-pointer items-center gap-1'>
          <input
            type='checkbox'
            checked={hasStorageOption(value, option)}
            onChange={() => onChange(toggleStorageOption(value, option))}
            className={`cursor-pointer accent-primary ${checkboxSize}`}
          />
          <span className={`${labelSize} text-muted-foreground`}>{option}</span>
        </label>
      ))}
    </>
  );
}
