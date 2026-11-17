import { useState, type ReactNode } from 'react';

import MoveItemDialog, { type MoveTargetCategory } from './MoveItemDialog';

/**
 * Drives the "move item to another category" dialog of a checklist editor.
 *
 * @param categories - Categories the item may move to.
 * @param onMove - Called with the item id and the chosen category id.
 * @returns `openMove` to start moving an item, and the `dialog` element to
 *   render (null while closed).
 */
export function useMoveItemDialog(
  categories: MoveTargetCategory[],
  onMove: (itemId: number, targetCategoryId: number) => void,
): {
  openMove: (item: { id: number; name: string }) => void;
  dialog: ReactNode;
} {
  const [moving, setMoving] = useState<{ id: number; name: string } | null>(
    null,
  );

  const dialog = moving ? (
    <MoveItemDialog
      itemName={moving.name}
      categories={categories}
      onSelect={categoryId => {
        onMove(moving.id, categoryId);
        setMoving(null);
      }}
      onCancel={() => setMoving(null)}
    />
  ) : null;

  return { openMove: setMoving, dialog };
}
