import { Pencil, Plus, X } from 'lucide-react';

import type { ChecklistCategory } from '@/types';

import EditableItemRow from '../../shared/EditableItemRow';

import { useEditState } from './useEditState';
import { useSaveCategoryEdit } from './useSaveCategoryEdit';

interface Props {
  category: ChecklistCategory;
  onClose: () => void;
  onSaved: () => void;
}

export default function CategoryEditModal({
  category,
  onClose,
  onSaved,
}: Props) {
  const {
    edit,
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

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4'
      /* v8 ignore next -- pure scroll-isolation UX, no business logic */
      onWheel={e => e.stopPropagation()}
    >
      <div className='absolute inset-0 bg-black/50' onClick={onClose} />
      <div className='bg-card border-border relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border shadow-xl'>
        {/* Header */}
        <div className='border-border flex items-center gap-3 border-b px-5 py-4'>
          <Pencil size={16} className='text-muted-foreground shrink-0' />
          <div className='min-w-0 flex-1'>
            <label className='text-muted-foreground mb-0.5 block text-xs'>
              分類名稱
            </label>
            <input
              value={edit.name}
              onFocus={e => e.target.select()}
              onChange={e => updateCategoryName(e.target.value)}
              className='text-foreground w-full bg-transparent text-sm font-semibold focus:outline-none'
              placeholder='分類名稱'
            />
          </div>
          <button
            onClick={onClose}
            className='text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1.5 transition-colors'
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
            className='border-border text-muted-foreground hover:border-primary hover:text-primary flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-sm transition-colors'
          >
            <Plus size={14} />
            新增項目
          </button>
        </div>

        {/* Footer */}
        <div className='border-border flex items-center justify-end gap-3 border-t px-5 py-4'>
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
