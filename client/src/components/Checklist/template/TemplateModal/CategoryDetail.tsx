import { Pencil, Trash2 } from 'lucide-react';

import type { ChecklistCategory } from '@/types';

import ItemCard from './ItemCard';

interface Props {
  category: ChecklistCategory;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Read-only detail pane for one template category: a header with its name,
 * item count and edit/delete actions, followed by its items as cards.
 */
export default function CategoryDetail({ category, onEdit, onDelete }: Props) {
  return (
    <>
      <div className='flex flex-wrap items-center gap-3 border-b border-border px-5 py-4'>
        <div className='min-w-0 flex-1'>
          <h3 className='truncate text-lg font-bold text-foreground'>
            {category.name}
          </h3>
          <p className='text-sm text-muted-foreground'>
            共 {category.items.length} 項物品
          </p>
        </div>
        <button
          type='button'
          onClick={onEdit}
          className='flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90'
        >
          <Pencil size={15} />
          編輯
        </button>
        <button
          type='button'
          onClick={onDelete}
          className='flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10'
        >
          <Trash2 size={15} />
          刪除
        </button>
      </div>

      <div className='flex-1 overflow-y-auto overscroll-contain px-5 py-4'>
        {category.items.length === 0 ? (
          <p className='py-10 text-center text-sm text-muted-foreground'>
            尚無項目，點擊「編輯」開始新增。
          </p>
        ) : (
          <ul className='mx-auto max-w-3xl space-y-3'>
            {category.items.map(item => (
              <ItemCard key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
