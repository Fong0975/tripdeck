import { Package } from 'lucide-react';

import {
  STORAGE_OPTIONS,
  hasStorageOption,
  toggleStorageOption,
} from './checklistUtils';

interface Props {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  /** Shows the value read-only, e.g. when the item's specs own it. */
  disabled?: boolean;
}

export default function StorageCheckboxes({
  value,
  onChange,
  disabled = false,
}: Props) {
  return (
    <>
      <Package size={14} className='shrink-0 text-muted-foreground' />
      {STORAGE_OPTIONS.map(option => (
        <label
          key={option}
          className={`flex items-center gap-1 ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          }`}
        >
          <input
            type='checkbox'
            checked={hasStorageOption(value, option)}
            disabled={disabled}
            onChange={() => onChange(toggleStorageOption(value, option))}
            className='size-4 cursor-[inherit] accent-primary'
          />
          <span className='text-sm text-muted-foreground'>{option}</span>
        </label>
      ))}
    </>
  );
}
