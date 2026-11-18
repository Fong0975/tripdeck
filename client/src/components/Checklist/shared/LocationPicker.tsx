import { getEffectiveLocations, NO_LOCATION } from '@tripdeck/shared';
import { ChevronDown, Package } from 'lucide-react';
import { useRef, useState } from 'react';

import AnchoredPopover from '@/components/ui/AnchoredPopover';

import { useLocationLabelSet } from '../locations/LocationLabelsContext';

import { toggleStorageOption } from './checklistUtils';

interface Props {
  /** Raw `storage_location` of the item or spec (comma separated names). */
  value: string | null | undefined;
  onChange: (value: string | null) => void;
}

/**
 * Chooses the storage locations of an item or spec. The selected locations
 * show as chips on a button that opens a checklist of every defined label.
 * A deleted label the value still carries is listed too, marked as deleted,
 * so it can be removed but never selected again once it is.
 */
export default function LocationPicker({ value, onChange }: Props) {
  const { names } = useLocationLabelSet();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const selected = getEffectiveLocations(value, names).filter(
    name => name !== NO_LOCATION,
  );
  const deleted = selected.filter(name => !names.includes(name));
  const options = [...names, ...deleted];

  return (
    <>
      <Package size={14} className='shrink-0 text-muted-foreground' />
      <button
        ref={anchorRef}
        type='button'
        aria-label='設定存放位置'
        aria-haspopup='true'
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className='flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-sm transition-colors hover:border-primary'
      >
        {selected.length === 0 ? (
          <span className='text-muted-foreground'>選擇位置</span>
        ) : (
          selected.map(name => (
            <span
              key={name}
              className={`rounded-sm px-1.5 py-0.5 ${
                deleted.includes(name)
                  ? 'border border-dashed border-border text-muted-foreground'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {name}
            </span>
          ))
        )}
        <ChevronDown size={12} className='text-muted-foreground' />
      </button>
      {open && (
        <AnchoredPopover
          anchorRef={anchorRef}
          label='存放位置'
          onClose={() => setOpen(false)}
        >
          {options.length === 0 ? (
            <p className='px-2 py-1 text-sm text-muted-foreground'>
              尚未建立位置標籤
            </p>
          ) : (
            options.map(option => (
              <label
                key={option}
                className='flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent'
              >
                <input
                  type='checkbox'
                  checked={selected.includes(option)}
                  onChange={() =>
                    onChange(toggleStorageOption(value, option, names))
                  }
                  className='size-4 accent-primary'
                />
                {deleted.includes(option) ? `${option}（已刪除）` : option}
              </label>
            ))
          )}
        </AnchoredPopover>
      )}
    </>
  );
}
