import { Plus } from 'lucide-react';

import type { ChecklistCategory } from '@/types';

interface Props {
  categories: ChecklistCategory[];
  selectedId: number | null;
  onSelect: (catId: number) => void;
  onAdd: () => void;
}

/**
 * Category navigation: a vertical list beside the detail pane on wide
 * screens, and a horizontally scrolling strip above it on narrow ones.
 */
export default function CategorySidebar({
  categories,
  selectedId,
  onSelect,
  onAdd,
}: Props) {
  return (
    <nav
      aria-label='行李分類'
      className='flex shrink-0 gap-2 overflow-x-auto border-b border-border bg-muted/30 p-3 md:w-64 md:flex-col md:overflow-x-visible md:overflow-y-auto md:border-r md:border-b-0'
    >
      {categories.map(cat => {
        const selected = cat.id === selectedId;
        return (
          <button
            key={cat.id}
            type='button'
            onClick={() => onSelect(cat.id)}
            aria-current={selected ? 'true' : undefined}
            className={`flex shrink-0 items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm transition-colors ${
              selected
                ? 'bg-primary font-semibold text-primary-foreground'
                : 'text-foreground hover:bg-accent'
            }`}
          >
            <span className='min-w-0 truncate'>{cat.name}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                selected
                  ? 'bg-primary-foreground/20'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {cat.items.length}
            </span>
          </button>
        );
      })}

      <button
        type='button'
        onClick={onAdd}
        className='flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary'
      >
        <Plus size={15} />
        新增分類
      </button>
    </nav>
  );
}
