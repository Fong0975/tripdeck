import { Pencil, X } from 'lucide-react';

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

export default function TripChecklistEditModal({
  tripId,
  checklist,
  onClose,
  onSaved,
}: Props) {
  const {
    edit,
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

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4'
      /* v8 ignore next -- pure scroll-isolation UX, no business logic */
      onWheel={e => e.stopPropagation()}
    >
      <div className='absolute inset-0 bg-black/50' onClick={onClose} />
      <div className='bg-card border-border relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-xl'>
        {/* Header */}
        <div className='border-border flex items-center gap-3 border-b px-6 py-4'>
          <Pencil size={16} className='text-muted-foreground shrink-0' />
          <h2 className='text-foreground flex-1 text-base font-semibold'>
            編輯行李清單
          </h2>
          <button
            onClick={onClose}
            className='text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1.5 transition-colors'
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
        <div className='border-border flex items-center justify-end gap-3 border-t px-6 py-4'>
          <button
            onClick={onClose}
            className='text-muted-foreground hover:text-foreground px-4 py-2 text-sm transition-colors'
          >
            取消
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50'
          >
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}
