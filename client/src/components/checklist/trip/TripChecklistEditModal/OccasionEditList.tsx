import { Plus, Trash2 } from 'lucide-react';

import type { EditOccasion } from '../../shared/types';

interface Props {
  occasions: EditOccasion[];
  onUpdateName: (id: number, name: string) => void;
  onRemove: (id: number) => void;
  onAdd: () => void;
}

export default function OccasionEditList({
  occasions,
  onUpdateName,
  onRemove,
  onAdd,
}: Props) {
  return (
    <div className='border-b border-border px-6 py-5'>
      <h3 className='mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
        時機
      </h3>
      <div className='space-y-2'>
        {occasions.map(occ => (
          <div
            key={occ.id}
            className='flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2'
          >
            <input
              value={occ.name}
              /* v8 ignore next -- select-all-on-focus convenience UX, low risk */
              onFocus={e => e.target.select()}
              onChange={e => onUpdateName(occ.id, e.target.value)}
              className='min-w-0 flex-1 bg-transparent text-sm text-foreground focus:outline-hidden'
              placeholder='時機名稱'
            />
            <button
              onClick={() => onRemove(occ.id)}
              disabled={occasions.length <= 1}
              className='shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30'
              aria-label='刪除時機'
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button
          onClick={onAdd}
          className='flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary'
        >
          <Plus size={12} />
          新增時機
        </button>
      </div>
    </div>
  );
}
