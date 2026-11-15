import { FIELD_LIMITS } from '@tripdeck/shared';
import { Pencil, Plus, X } from 'lucide-react';

import DiscardChangesDialog from '@/components/ui/DiscardChangesDialog';
import ModalOverlay from '@/components/ui/ModalOverlay';
import { useConfirmLeave } from '@/hooks/useConfirmLeave';
import type { ChecklistCategory } from '@/types';

import EditableItemRow from '../../shared/EditableItemRow';

import { useEditState } from './useEditState';
import { useSaveCategoryEdit } from './useSaveCategoryEdit';

interface Props {
  category: ChecklistCategory;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Dialog for editing a checklist template category's name and items→specs
 * as a local draft that is saved in one go. Closing with unsaved edits
 * (backdrop, Escape, close or cancel button) asks for confirmation first.
 */
export default function CategoryEditModal({
  category,
  onClose,
  onSaved,
}: Props) {
  const {
    edit,
    isDirty,
    scrollBodyRef,
    visibleItems,
    updateCategoryName,
    updateItem,
    handleDeleteItem,
    addItem,
    updateSpec,
    deleteSpec,
    addSpec,
  } = useEditState(category);

  const { saving, handleSave } = useSaveCategoryEdit(
    category,
    edit,
    onSaved,
    onClose,
  );
  const { showLeaveConfirm, guardedLeave, confirmLeave, cancelLeave } =
    useConfirmLeave(isDirty, onClose);

  return (
    <ModalOverlay onClose={guardedLeave} isolateWheel>
      <div className='relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl'>
        {/* Header */}
        <div className='flex items-center gap-3 border-b border-border px-5 py-4'>
          <Pencil size={16} className='shrink-0 text-muted-foreground' />
          <div className='min-w-0 flex-1'>
            <label className='mb-0.5 block text-xs text-muted-foreground'>
              分類名稱
            </label>
            <input
              value={edit.name}
              maxLength={FIELD_LIMITS.name}
              onFocus={e => e.target.select()}
              onChange={e => updateCategoryName(e.target.value)}
              className='w-full bg-transparent text-sm font-semibold text-foreground focus:outline-hidden'
              placeholder='分類名稱'
            />
          </div>
          <button
            onClick={guardedLeave}
            className='shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground'
            aria-label='關閉'
          >
            <X size={16} />
          </button>
        </div>

        {/* Items */}
        <div
          ref={scrollBodyRef}
          className='flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4'
        >
          {visibleItems.map((item, itemIdx) => (
            <EditableItemRow
              key={item.id}
              item={item}
              index={itemIdx}
              onUpdateItem={updateItem}
              onDeleteItem={handleDeleteItem}
              onUpdateSpec={updateSpec}
              onDeleteSpec={deleteSpec}
              onAddSpec={addSpec}
            />
          ))}

          <button
            onClick={addItem}
            className='flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary'
          >
            <Plus size={14} />
            新增項目
          </button>
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-3 border-t border-border px-5 py-4'>
          <button
            onClick={guardedLeave}
            className='px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground'
          >
            取消
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className='rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50'
          >
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </div>
      {showLeaveConfirm && (
        <DiscardChangesDialog onCancel={cancelLeave} onConfirm={confirmLeave} />
      )}
    </ModalOverlay>
  );
}
