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
    <div className='border-border border-b px-6 py-5'>
      <h3 className='text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide'>
        時機
      </h3>
      <div className='space-y-2'>
        {occasions.map(occ => (
          <div
            key={occ.id}
            className='bg-muted/30 border-border flex items-center gap-2 rounded-lg border px-3 py-2'
          >
            <input
              value={occ.name}
              onFocus={e => e.target.select()}
              onChange={e => onUpdateName(occ.id, e.target.value)}
              className='text-foreground min-w-0 flex-1 bg-transparent text-sm focus:outline-none'
              placeholder='時機名稱'
            />
            <button
              onClick={() => onRemove(occ.id)}
              disabled={occasions.length <= 1}
              className='text-muted-foreground hover:text-destructive shrink-0 rounded p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30'
              aria-label='刪除時機'
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button
          onClick={onAdd}
          className='text-muted-foreground hover:text-primary flex items-center gap-1 text-xs transition-colors'
        >
          <Plus size={12} />
          新增時機
        </button>
      </div>
    </div>
  );
}
