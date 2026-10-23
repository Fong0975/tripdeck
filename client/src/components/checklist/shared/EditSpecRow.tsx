import { Trash2 } from 'lucide-react';

import StorageCheckboxes from './StorageCheckboxes';
import type { EditSpec } from './types';

interface Props {
  spec: EditSpec;
  index: number;
  /** Tighter spacing for use inside the nested trip-checklist category view. */
  compact?: boolean;
  onUpdate: (fields: Partial<EditSpec>) => void;
  onDelete: () => void;
}

export default function EditSpecRow({
  spec,
  index,
  compact = false,
  onUpdate,
  onDelete,
}: Props) {
  return (
    <div className='flex items-center gap-2'>
      <span
        /* v8 ignore next -- compact/regular are both purely cosmetic width variants */
        className={`shrink-0 text-xs text-muted-foreground ${compact ? 'w-4' : 'w-5'}`}
      >
        {index + 1}.
      </span>
      <input
        value={spec.name}
        onFocus={e => e.target.select()}
        onChange={e => onUpdate({ name: e.target.value })}
        placeholder='規格名稱'
        className='min-w-0 flex-1 bg-transparent text-xs text-foreground/80 focus:outline-hidden'
      />
      <StorageCheckboxes
        value={spec.storage_location}
        onChange={loc => onUpdate({ storage_location: loc })}
        compact
      />
      <button
        onClick={onDelete}
        className='shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-destructive'
        aria-label='刪除規格'
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}
