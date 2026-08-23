import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import StorageBadges from '@/components/checklist/shared/StorageBadges';
import type { ChecklistCategory } from '@/types';

interface CategoryCardProps {
  category: ChecklistCategory;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CategoryCard({
  category,
  onEdit,
  onDelete,
}: CategoryCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className='border-border bg-card overflow-hidden rounded-xl border'>
      <div
        className={`border-border bg-muted/40 flex items-center gap-2 px-4 py-3${expanded ? 'border-b' : ''}`}
      >
        <button
          onClick={() => setExpanded(prev => !prev)}
          className='flex min-w-0 flex-1 items-center gap-2 text-left'
          aria-expanded={expanded}
        >
          <span className='text-muted-foreground shrink-0'>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span className='text-foreground min-w-0 flex-1 text-sm font-semibold'>
            {category.name}
          </span>
          <span className='text-muted-foreground shrink-0 text-xs'>
            {category.items.length} 項
          </span>
        </button>
        <button
          onClick={onEdit}
          className='text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-md p-1 transition-colors'
          aria-label='編輯分類'
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md p-1 transition-colors'
          aria-label='刪除分類'
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className='divide-border divide-y'>
          {category.items.length === 0 && (
            <div className='px-4 py-3'>
              <span className='text-muted-foreground text-xs'>尚無項目</span>
            </div>
          )}
          {category.items.map(item => (
            <div key={item.id} className='px-4 py-3'>
              <div className='flex items-start gap-2'>
                <span className='text-muted-foreground mt-0.5 shrink-0 text-sm'>
                  •
                </span>
                <div className='min-w-0 flex-1 space-y-1'>
                  <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5'>
                    <span className='text-foreground text-sm font-medium'>
                      {item.name}
                    </span>
                    <span className='text-muted-foreground text-xs'>
                      {item.quantity ? `× ${item.quantity}` : '些許'}
                    </span>
                  </div>
                  {item.notes && (
                    <p className='text-muted-foreground text-xs'>
                      {item.notes}
                    </p>
                  )}
                  {item.storage_location && (
                    <div className='flex items-center gap-1.5'>
                      <StorageBadges value={item.storage_location} />
                    </div>
                  )}
                  {(item.specs ?? []).length > 0 && (
                    <div className='border-border mt-1 space-y-1 border-l-2 pl-3'>
                      {(item.specs ?? []).map((spec, idx) => (
                        <div
                          key={spec.id}
                          className='flex flex-wrap items-center gap-x-1.5 gap-y-0.5'
                        >
                          <span className='text-muted-foreground text-xs'>
                            {idx + 1}.
                          </span>
                          <span className='text-foreground/80 text-xs'>
                            {spec.name}
                          </span>
                          {spec.storage_location && (
                            <StorageBadges
                              value={spec.storage_location}
                              compact
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
