import { FIELD_LIMITS } from '@tripdeck/shared';
import { Trash2 } from 'lucide-react';

import StorageCheckboxes from './StorageCheckboxes';
import type { EditSpec } from './types';

interface Props {
  spec: EditSpec;
  index: number;
  onUpdate: (fields: Partial<EditSpec>) => void;
  onDelete: () => void;
}

export default function EditSpecRow({
  spec,
  index,
  onUpdate,
  onDelete,
}: Props) {
  return (
    <div className='flex flex-wrap items-center gap-2 gap-y-1.5'>
      <span className='w-6 shrink-0 text-sm text-muted-foreground'>
        {index + 1}.
      </span>
      <input
        value={spec.name}
        maxLength={FIELD_LIMITS.name}
        onFocus={e => e.target.select()}
        onChange={e => onUpdate({ name: e.target.value })}
        placeholder='規格名稱'
        className='min-w-0 flex-1 basis-40 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:border-primary focus:outline-hidden'
      />
      <div className='flex items-center gap-2'>
        <StorageCheckboxes
          value={spec.storage_location}
          onChange={loc => onUpdate({ storage_location: loc })}
        />
      </div>
      <button
        onClick={onDelete}
        className='shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-destructive'
        aria-label='刪除規格'
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
