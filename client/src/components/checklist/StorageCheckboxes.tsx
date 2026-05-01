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
}

export default function StorageCheckboxes({
  value,
  onChange,
  compact = false,
}: Props) {
  return (
    <>
      <Package
        size={compact ? 10 : 12}
        className='text-muted-foreground shrink-0'
      />
      {STORAGE_OPTIONS.map(option => (
        <label key={option} className='flex cursor-pointer items-center gap-1'>
          <input
            type='checkbox'
            checked={hasStorageOption(value, option)}
            onChange={() => onChange(toggleStorageOption(value, option))}
            className={`accent-primary cursor-pointer ${compact ? 'size-3' : 'size-3.5'}`}
          />
          <span className='text-muted-foreground text-xs'>{option}</span>
        </label>
      ))}
    </>
  );
}
