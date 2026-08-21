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
        className={`text-muted-foreground shrink-0 text-xs ${compact ? 'w-4' : 'w-5'}`}
      >
        {index + 1}.
      </span>
      <input
        value={spec.name}
        onFocus={e => e.target.select()}
        onChange={e => onUpdate({ name: e.target.value })}
        placeholder='規格名稱'
        className='text-foreground/80 min-w-0 flex-1 bg-transparent text-xs focus:outline-none'
      />
      <StorageCheckboxes
        value={spec.storage_location}
        onChange={loc => onUpdate({ storage_location: loc })}
        compact
      />
      <button
        onClick={onDelete}
        className='text-muted-foreground hover:text-destructive shrink-0 rounded p-0.5 transition-colors'
        aria-label='刪除規格'
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}
