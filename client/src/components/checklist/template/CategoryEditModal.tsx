import { Pencil, Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';

import type { ChecklistCategory } from '@/types';
import {
  addTemplateItem,
  addTemplateItemSpec,
  deleteTemplateItem,
  deleteTemplateItemSpec,
  updateTemplateCategory,
  updateTemplateItem,
  updateTemplateItemSpec,
} from '@/utils/storage';

import {
  itemFieldsChanged,
  itemPayload,
  specFieldsChanged,
  specPayload,
  syncEditableList,
} from '../shared/checklistDiffSync';
import { nextTempId } from '../shared/checklistUtils';
import EditableItemRow from '../shared/EditableItemRow';
import type { EditCategory, EditItem, EditSpec } from '../shared/types';

function categoryToEditState(cat: ChecklistCategory): EditCategory {
  return {
    id: cat.id,
    name: cat.name,
    items: cat.items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity ?? null,
      notes: item.notes ?? null,
      storage_location: item.storage_location ?? null,
      specs: (item.specs ?? []).map(spec => ({
        id: spec.id,
        name: spec.name,
        storage_location: spec.storage_location,
      })),
    })),
  };
}

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
  const [edit, setEdit] = useState<EditCategory>(() =>
    categoryToEditState(category),
  );
  const [saving, setSaving] = useState(false);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const updateCategoryName = (name: string) => {
    setEdit(prev => ({ ...prev, name }));
  };

  const updateItem = (itemId: number, fields: Partial<EditItem>) => {
    setEdit(prev => ({
      ...prev,
      items: prev.items.map(i => (i.id === itemId ? { ...i, ...fields } : i)),
    }));
  };

  const handleDeleteItem = (itemId: number) => {
    if (itemId < 0) {
      setEdit(prev => ({
        ...prev,
        items: prev.items.filter(i => i.id !== itemId),
      }));
    } else {
      setEdit(prev => ({
        ...prev,
        items: prev.items.map(i =>
          i.id === itemId ? { ...i, _deleted: true } : i,
        ),
      }));
    }
  };

  const addItem = () => {
    const newItem: EditItem = {
      id: nextTempId(),
      name: '新項目',
      quantity: null,
      notes: null,
      storage_location: null,
      specs: [],
    };
    setEdit(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setTimeout(() => {
      scrollBodyRef.current?.scrollTo({
        top: scrollBodyRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 0);
  };

  const updateSpec = (
    itemId: number,
    specId: number,
    fields: Partial<EditSpec>,
  ) => {
    setEdit(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.id === itemId
          ? {
              ...i,
              specs: i.specs.map(s =>
                s.id === specId ? { ...s, ...fields } : s,
              ),
            }
          : i,
      ),
    }));
  };

  const deleteSpec = (itemId: number, specId: number) => {
    setEdit(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.id === itemId
          ? { ...i, specs: i.specs.filter(s => s.id !== specId) }
          : i,
      ),
    }));
  };

  const addSpec = (itemId: number) => {
    const newSpec: EditSpec = {
      id: nextTempId(),
      name: '新規格',
      storage_location: null,
    };
    setEdit(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.id === itemId ? { ...i, specs: [...i.specs, newSpec] } : i,
      ),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const catId = edit.id;

      if (edit.name.trim() && edit.name.trim() !== category.name) {
        await updateTemplateCategory(catId, edit.name.trim());
      }

      await syncEditableList(category.items, edit.items, {
        isChanged: itemFieldsChanged,
        update: (itemId, editItem, origItem) =>
          updateTemplateItem(
            catId,
            itemId,
            itemPayload(editItem, origItem.name),
          ),
        add: editItem =>
          addTemplateItem(catId, itemPayload(editItem, '新項目')),
        remove: itemId => deleteTemplateItem(catId, itemId),
        syncChildren: (editItem, itemId, origItem) =>
          syncEditableList(origItem?.specs ?? [], editItem.specs, {
            isChanged: specFieldsChanged,
            update: (specId, editSpec, origSpec) =>
              updateTemplateItemSpec(
                catId,
                itemId,
                specId,
                specPayload(editSpec, origSpec.name),
              ),
            add: editSpec =>
              addTemplateItemSpec(catId, itemId, specPayload(editSpec)),
            remove: specId => deleteTemplateItemSpec(catId, itemId, specId),
          }),
      });

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const visibleItems = edit.items.filter(i => !i._deleted);

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
