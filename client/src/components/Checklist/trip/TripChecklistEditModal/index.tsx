import { MapPin, Pencil, X } from 'lucide-react';
import { useState } from 'react';

import DiscardChangesDialog from '@/components/ui/DiscardChangesDialog';
import ModalOverlay from '@/components/ui/ModalOverlay';
import { useConfirmLeave } from '@/hooks/useConfirmLeave';
import type { TripChecklist } from '@/types';

import LocationLabelsModal from '../../locations/LocationLabelsModal';
import CategorySidebar from '../../shared/CategorySidebar';

import CategoryEditPane from './CategoryEditPane';
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
    scrollBodyRef,
    visibleOccasions,
    visibleCategories,
    selectedCategory,
    selectCategory,
    addOccasionLocal,
    updateOccasionName,
    removeOccasion,
    addCategoryLocal,
    updateCategoryName,
    removeCategory,
    reorderCategories,
    reorderItems,
    moveItem,
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
  const [managingLocations, setManagingLocations] = useState(false);

  return (
    <>
      <ModalOverlay onClose={guardedLeave} isolateWheel>
        <div className='relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl'>
          {/* Header */}
          <div className='flex items-center gap-3 border-b border-border px-6 py-4'>
            <Pencil size={16} className='shrink-0 text-muted-foreground' />
            <h2 className='flex-1 text-base font-semibold text-foreground'>
              編輯行李清單
            </h2>
            <button
              type='button'
              onClick={() => setManagingLocations(true)}
              className='inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent'
            >
              <MapPin size={14} />
              存放位置
            </button>
            <button
              onClick={guardedLeave}
              className='shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground'
              aria-label='關閉'
            >
              <X size={16} />
            </button>
          </div>

          <OccasionEditList
            occasions={visibleOccasions}
            onUpdateName={updateOccasionName}
            onRemove={removeOccasion}
            onAdd={addOccasionLocal}
          />

          {/* Body */}
          <div className='flex min-h-0 flex-1 flex-col md:flex-row'>
            <CategorySidebar
              categories={visibleCategories.map(c => ({
                id: c.id,
                name: c.name,
                count: c.items.filter(i => !i._deleted).length,
              }))}
              selectedId={selectedCategory?.id ?? null}
              onSelect={selectCategory}
              onAdd={addCategoryLocal}
              onReorder={reorderCategories}
            />
            <section className='flex min-h-0 min-w-0 flex-1 flex-col'>
              {selectedCategory ? (
                <CategoryEditPane
                  key={selectedCategory.id}
                  category={selectedCategory}
                  otherCategories={visibleCategories
                    .filter(c => c.id !== selectedCategory.id)
                    .map(c => ({ id: c.id, name: c.name }))}
                  scrollBodyRef={scrollBodyRef}
                  onUpdateName={updateCategoryName}
                  onRemove={removeCategory}
                  onAddItem={addItemLocal}
                  onUpdateItem={updateItem}
                  onDeleteItem={removeItem}
                  onAddSpec={addSpecLocal}
                  onUpdateSpec={updateSpec}
                  onDeleteSpec={removeSpec}
                  onReorderItems={reorderItems}
                  onMoveItem={moveItem}
                />
              ) : (
                <p className='py-16 text-center text-sm text-muted-foreground'>
                  尚無分類，請先新增一個分類。
                </p>
              )}
            </section>
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
          <DiscardChangesDialog
            onCancel={cancelLeave}
            onConfirm={confirmLeave}
          />
        )}
      </ModalOverlay>
      {managingLocations && (
        <LocationLabelsModal onClose={() => setManagingLocations(false)} />
      )}
    </>
  );
}
