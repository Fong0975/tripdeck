import { Pencil, X } from 'lucide-react';

import DiscardChangesDialog from '@/components/ui/DiscardChangesDialog';
import ModalOverlay from '@/components/ui/ModalOverlay';
import { useConfirmLeave } from '@/hooks/useConfirmLeave';
import type { TripChecklist } from '@/types';

import CategoryEditList from './CategoryEditList';
import OccasionEditList from './OccasionEditList';
import { useEditState } from './useEditState';
import { useSaveChecklist } from './useSaveChecklist';

interface Props {
  tripId: number;
  checklist: TripChecklist;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Dialog for editing a trip checklist's occasions and categories→items→specs
 * as a local draft that is saved in one go. Closing with unsaved edits
 * (backdrop, Escape, close or cancel button) asks for confirmation first.
 */
export default function TripChecklistEditModal({
  tripId,
  checklist,
  onClose,
  onSaved,
}: Props) {
  const {
    edit,
    isDirty,
    expandedCats,
    scrollBodyRef,
    visibleOccasions,
    visibleCategories,
    addOccasionLocal,
    updateOccasionName,
    removeOccasion,
    addCategoryLocal,
    updateCategoryName,
    removeCategory,
    toggleCatExpanded,
    addItemLocal,
    updateItem,
    removeItem,
    addSpecLocal,
    updateSpec,
    removeSpec,
  } = useEditState(checklist);

  const { saving, handleSave } = useSaveChecklist(
    tripId,
    checklist,
    edit,
    onSaved,
    onClose,
  );
  const { showLeaveConfirm, guardedLeave, confirmLeave, cancelLeave } =
    useConfirmLeave(isDirty, onClose);

  return (
    <ModalOverlay onClose={guardedLeave} isolateWheel>
      <div className='relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl'>
        {/* Header */}
        <div className='flex items-center gap-3 border-b border-border px-6 py-4'>
          <Pencil size={16} className='shrink-0 text-muted-foreground' />
          <h2 className='flex-1 text-base font-semibold text-foreground'>
            編輯行李清單
          </h2>
          <button
            onClick={guardedLeave}
            className='shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground'
            aria-label='關閉'
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div
          ref={scrollBodyRef}
          className='flex-1 space-y-0 overflow-y-auto overscroll-contain'
        >
          <OccasionEditList
            occasions={visibleOccasions}
            onUpdateName={updateOccasionName}
            onRemove={removeOccasion}
            onAdd={addOccasionLocal}
          />
          <CategoryEditList
            categories={visibleCategories}
            expandedCats={expandedCats}
            onToggleExpand={toggleCatExpanded}
            onUpdateName={updateCategoryName}
            onRemove={removeCategory}
            onAddCategory={addCategoryLocal}
            onAddItem={addItemLocal}
            onUpdateItem={updateItem}
            onDeleteItem={removeItem}
            onAddSpec={addSpecLocal}
            onUpdateSpec={updateSpec}
            onDeleteSpec={removeSpec}
          />
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-3 border-t border-border px-6 py-4'>
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
