import { Package } from 'lucide-react';

import {
  STORAGE_OPTIONS,
  hasStorageOption,
  toggleStorageOption,
} from './checklistUtils';

interface Props {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
}

export default function StorageCheckboxes({ value, onChange }: Props) {
  return (
    <>
      <Package size={14} className='shrink-0 text-muted-foreground' />
      {STORAGE_OPTIONS.map(option => (
        <label key={option} className='flex cursor-pointer items-center gap-1'>
          <input
            type='checkbox'
            checked={hasStorageOption(value, option)}
            onChange={() => onChange(toggleStorageOption(value, option))}
            className='size-4 cursor-pointer accent-primary'
          />
          <span className='text-sm text-muted-foreground'>{option}</span>
        </label>
      ))}
    </>
  );
}
