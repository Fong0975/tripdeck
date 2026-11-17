import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  id: number;
  className?: string;
  /** Receives the drag handle so the row can place it where it fits. */
  children: (dragHandle: ReactNode) => ReactNode;
}

/**
 * One draggable row of a {@link SortableList}. It owns the sortable wiring
 * and hands the row's content a ready-made drag handle.
 */
export default function SortableRow({ id, className, children }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const dragHandle = (
    <button
      type='button'
      {...attributes}
      {...listeners}
      className='shrink-0 cursor-grab touch-none rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing'
      aria-label='拖曳排序'
    >
      <GripVertical size={16} />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={className}
    >
      {children(dragHandle)}
    </div>
  );
}
