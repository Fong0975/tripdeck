import { Plus } from 'lucide-react';

import SortableList from './SortableList';
import SortableRow from './SortableRow';

export interface SidebarCategory {
  id: number;
  name: string;
  /** Number of items shown in the badge. */
  count: number;
}

interface Props {
  categories: SidebarCategory[];
  selectedId: number | null;
  onSelect: (catId: number) => void;
  onAdd: () => void;
  /** Enables drag-and-drop sorting; called with the dragged and target ids. */
  onReorder?: (activeId: number, overId: number) => void;
}

/**
 * Category navigation: a vertical list beside the detail pane on wide
 * screens, and a horizontally scrolling strip above it on narrow ones.
 * With `onReorder`, every category gets a drag handle for sorting.
 */
export default function CategorySidebar({
  categories,
  selectedId,
  onSelect,
  onAdd,
  onReorder,
}: Props) {
  const renderSelectButton = (cat: SidebarCategory) => {
    const selected = cat.id === selectedId;
    return (
      <button
        type='button'
        onClick={() => onSelect(cat.id)}
        aria-current={selected ? 'true' : undefined}
        className={`flex min-w-0 flex-1 shrink-0 items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm transition-colors ${
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
          {cat.count}
        </span>
      </button>
    );
  };

  const addButton = (
    <button
      type='button'
      onClick={onAdd}
      className='flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary'
    >
      <Plus size={15} />
      新增分類
    </button>
  );

  const list = onReorder ? (
    <SortableList
      ids={categories.map(c => c.id)}
      onReorder={onReorder}
      layout='rect'
    >
      {categories.map(cat => (
        <SortableRow
          key={cat.id}
          id={cat.id}
          className='flex shrink-0 items-center gap-1'
        >
          {dragHandle => (
            <>
              {dragHandle}
              {renderSelectButton(cat)}
            </>
          )}
        </SortableRow>
      ))}
    </SortableList>
  ) : (
    categories.map(cat => (
      <div key={cat.id} className='flex shrink-0'>
        {renderSelectButton(cat)}
      </div>
    ))
  );

  return (
    <nav
      aria-label='行李分類'
      className='flex shrink-0 gap-2 overflow-x-auto border-b border-border bg-muted/30 p-3 md:w-64 md:flex-col md:overflow-x-visible md:overflow-y-auto md:border-r md:border-b-0'
    >
      {list}
      {addButton}
    </nav>
  );
}
