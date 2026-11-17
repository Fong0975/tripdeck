import type { DragEndEvent } from '@dnd-kit/core';

/**
 * Translates a finished drag into a reorder request.
 *
 * @param event - The dnd-kit drag-end event.
 * @param onReorder - Called with the dragged and target row ids.
 * @returns Nothing; drops outside the list or onto the same row are ignored.
 */
export function reorderFromDragEnd(
  event: Pick<DragEndEvent, 'active' | 'over'>,
  onReorder: (activeId: number, overId: number) => void,
): void {
  const { active, over } = event;
  if (over && active.id !== over.id) {
    onReorder(Number(active.id), Number(over.id));
  }
}
