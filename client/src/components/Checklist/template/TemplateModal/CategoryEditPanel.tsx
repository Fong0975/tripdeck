import { FIELD_LIMITS } from '@tripdeck/shared';
import { Plus } from 'lucide-react';
import { useEffect, useId } from 'react';

import type { ChecklistCategory } from '@/types';

import EditableItemRow from '../../shared/EditableItemRow';
import type { MoveTargetCategory } from '../../shared/MoveItemDialog';
import SortableList from '../../shared/SortableList';
import SortableRow from '../../shared/SortableRow';
import { useMoveItemDialog } from '../../shared/useMoveItemDialog';

import { useEditState } from './useEditState';
import { useSaveCategoryEdit } from './useSaveCategoryEdit';

interface Props {
  category: ChecklistCategory;
  /** The other template categories an item can be moved to. */
  otherCategories: MoveTargetCategory[];
  /** Called after a successful save, before the panel is dismissed. */
  onSaved: () => void;
  /** Dismisses the panel after a successful save. */
  onDone: () => void;
  /** User asked to leave without saving; the parent decides whether to confirm. */
  onCancel: () => void;
  /** Reports whether the draft differs from `category` (false again on unmount). */
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * Inline editor for one template category's name and items→specs. It edits a
 * local draft that is saved in one go; the parent is told when the draft is
 * dirty so it can guard navigation away from unsaved changes.
 */
export default function CategoryEditPanel({
  category,
  otherCategories,
  onSaved,
  onDone,
  onCancel,
  onDirtyChange,
}: Props) {
  const nameId = useId();
  const {
    edit,
    isDirty,
    scrollBodyRef,
    visibleItems,
    updateCategoryName,
    updateItem,
    handleDeleteItem,
    reorderItems,
    moveItem,
    addItem,
    updateSpec,
    deleteSpec,
    addSpec,
  } = useEditState(category);
  const { saving, handleSave } = useSaveCategoryEdit(
    category,
    edit,
    onSaved,
    onDone,
  );

  const { openMove, dialog: moveDialog } = useMoveItemDialog(
    otherCategories,
    moveItem,
  );

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  return (
    <>
      <div className='border-b border-border px-5 py-4'>
        <label
          htmlFor={nameId}
          className='mb-1 block text-sm text-muted-foreground'
        >
          分類名稱
        </label>
        <input
          id={nameId}
          value={edit.name}
          maxLength={FIELD_LIMITS.name}
          onFocus={e => e.target.select()}
          onChange={e => updateCategoryName(e.target.value)}
          className='w-full rounded-lg border border-border bg-background px-3 py-2 text-base font-semibold text-foreground focus:border-primary focus:outline-hidden'
          placeholder='分類名稱'
        />
      </div>

      <div
        ref={scrollBodyRef}
        className='flex-1 overflow-y-auto overscroll-contain px-5 py-4'
      >
        <div className='mx-auto max-w-3xl space-y-3'>
          <SortableList
            ids={visibleItems.map(item => item.id)}
            onReorder={reorderItems}
          >
            {visibleItems.map((item, itemIdx) => (
              <SortableRow key={item.id} id={item.id}>
                {dragHandle => (
                  <EditableItemRow
                    item={item}
                    index={itemIdx}
                    dragHandle={dragHandle}
                    onUpdateItem={updateItem}
                    onDeleteItem={handleDeleteItem}
                    onUpdateSpec={updateSpec}
                    onDeleteSpec={deleteSpec}
                    onAddSpec={addSpec}
                    onMoveItem={openMove}
                    moveDisabled={item.id < 0 || otherCategories.length === 0}
                  />
                )}
              </SortableRow>
            ))}
          </SortableList>

          <button
            type='button'
            onClick={addItem}
            className='flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary'
          >
            <Plus size={15} />
            新增項目
          </button>
        </div>
      </div>

      <div className='flex items-center justify-end gap-3 border-t border-border px-5 py-4'>
        <button
          type='button'
          onClick={onCancel}
          className='px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground'
        >
          取消
        </button>
        <button
          type='button'
          onClick={() => void handleSave()}
          disabled={saving}
          className='rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50'
        >
          {saving ? '儲存中…' : '儲存'}
        </button>
      </div>
      {moveDialog}
    </>
  );
}
