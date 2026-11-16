import { FIELD_LIMITS } from '@tripdeck/shared';
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
    <div
      /* v8 ignore next -- compact/regular are both purely cosmetic layout variants */
      className={`flex items-center gap-2 ${compact ? '' : 'flex-wrap gap-y-1.5'}`}
    >
      <span
        /* v8 ignore next -- compact/regular are both purely cosmetic width variants */
        className={`shrink-0 text-muted-foreground ${compact ? 'w-4 text-xs' : 'w-6 text-sm'}`}
      >
        {index + 1}.
      </span>
      <input
        value={spec.name}
        maxLength={FIELD_LIMITS.name}
        onFocus={e => e.target.select()}
        onChange={e => onUpdate({ name: e.target.value })}
        placeholder='規格名稱'
        /* v8 ignore next -- compact/regular are both purely cosmetic input variants */
        className={`min-w-0 flex-1 focus:outline-hidden ${
          compact
            ? 'bg-transparent text-xs text-foreground/80'
            : 'basis-40 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:border-primary'
        }`}
      />
      <div className='flex items-center gap-2'>
        <StorageCheckboxes
          value={spec.storage_location}
          onChange={loc => onUpdate({ storage_location: loc })}
          compact={compact}
          large={!compact}
        />
      </div>
      <button
        onClick={onDelete}
        className='shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-destructive'
        aria-label='刪除規格'
      >
        {/* v8 ignore next -- compact/regular are both purely cosmetic icon-size variants */}
        <Trash2 size={compact ? 11 : 15} />
      </button>
    </div>
  );
}
