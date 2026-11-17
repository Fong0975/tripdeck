import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { ReactNode } from 'react';

import { reorderFromDragEnd } from './reorderFromDragEnd';

interface Props {
  /** Ids of the sortable rows, in their current order. */
  ids: number[];
  /** Called with the dragged row's id and the id of the row it was dropped on. */
  onReorder: (activeId: number, overId: number) => void;
  /** `rect` suits lists that wrap or scroll horizontally. */
  layout?: 'vertical' | 'rect';
  children: ReactNode;
}

/**
 * Drag-and-drop sorting container for checklist rows. Rows render inside it
 * through {@link SortableRow}. Dragging starts from a handle after a small
 * movement, so clicks on the row itself are unaffected, and the handle also
 * works from the keyboard.
 */
export default function SortableList({
  ids,
  onReorder,
  layout = 'vertical',
  children,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={event => reorderFromDragEnd(event, onReorder)}
    >
      <SortableContext
        items={ids}
        strategy={
          layout === 'vertical'
            ? verticalListSortingStrategy
            : rectSortingStrategy
        }
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}
