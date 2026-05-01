import { Pencil, Plus, Trash2, X } from 'lucide-react';
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

import { nextTempId } from './checklistUtils';
import StorageCheckboxes from './StorageCheckboxes';
import type { EditCategory, EditItem, EditSpec } from './types';

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

      const keptOriginalIds = new Set(
        edit.items.filter(i => !i._deleted && i.id > 0).map(i => i.id),
      );
      for (const origItem of category.items) {
        if (!keptOriginalIds.has(origItem.id)) {
          await deleteTemplateItem(catId, origItem.id);
        }
      }

      for (const editItem of edit.items.filter(i => !i._deleted && i.id > 0)) {
        const origItem = category.items.find(i => i.id === editItem.id);
        if (!origItem) {
          continue;
        }

        const fieldsChanged =
          editItem.name.trim() !== origItem.name ||
          editItem.quantity !== (origItem.quantity ?? null) ||
          (editItem.notes ?? null) !== (origItem.notes ?? null) ||
          (editItem.storage_location ?? null) !==
            (origItem.storage_location ?? null);

        if (fieldsChanged) {
          await updateTemplateItem(catId, editItem.id, {
            name: editItem.name.trim() || origItem.name,
            quantity: editItem.quantity,
            notes: editItem.notes ?? null,
            storage_location: editItem.storage_location,
          });
        }

        const origSpecs = origItem.specs ?? [];
        const keptSpecIds = new Set(
          editItem.specs.filter(s => s.id > 0).map(s => s.id),
        );

        for (const origSpec of origSpecs) {
          if (!keptSpecIds.has(origSpec.id)) {
            await deleteTemplateItemSpec(catId, editItem.id, origSpec.id);
          }
        }

        for (const editSpec of editItem.specs.filter(s => s.id > 0)) {
          const origSpec = origSpecs.find(s => s.id === editSpec.id);
          if (!origSpec) {
            continue;
          }
          const specChanged =
            editSpec.name.trim() !== origSpec.name ||
            (editSpec.storage_location ?? null) !==
              (origSpec.storage_location ?? null);
          if (specChanged) {
            await updateTemplateItemSpec(catId, editItem.id, editSpec.id, {
              name: editSpec.name.trim() || origSpec.name,
              storage_location: editSpec.storage_location,
            });
          }
        }

        for (const editSpec of editItem.specs.filter(s => s.id < 0)) {
          await addTemplateItemSpec(catId, editItem.id, {
            name: editSpec.name.trim() || '新規格',
            storage_location: editSpec.storage_location,
          });
        }
      }

      for (const editItem of edit.items.filter(i => !i._deleted && i.id < 0)) {
        const newItem = await addTemplateItem(catId, {
          name: editItem.name.trim() || '新項目',
          quantity: editItem.quantity,
          notes: editItem.notes ?? null,
          storage_location: editItem.storage_location,
        });
        for (const spec of editItem.specs) {
          await addTemplateItemSpec(catId, newItem.id, {
            name: spec.name.trim() || '新規格',
            storage_location: spec.storage_location,
          });
        }
      }

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
            <div
              key={item.id}
              className='bg-muted/30 border-border rounded-xl border p-4'
            >
              <div className='flex items-start gap-2'>
                <span className='text-muted-foreground mt-2 w-5 shrink-0 text-xs'>
                  {itemIdx + 1}.
                </span>
                <div className='min-w-0 flex-1 space-y-1.5'>
                  <input
                    value={item.name}
                    onFocus={e => e.target.select()}
                    onChange={e =>
                      updateItem(item.id, { name: e.target.value })
                    }
                    className='text-foreground w-full bg-transparent text-sm font-medium focus:outline-none'
                    placeholder='項目名稱'
                  />

                  <div className='flex items-center gap-3'>
                    <div className='flex items-center gap-1'>
                      <span className='text-muted-foreground text-xs'>x</span>
                      <input
                        type='number'
                        min={1}
                        value={item.quantity ?? ''}
                        onChange={e => {
                          const v = e.target.value;
                          updateItem(item.id, {
                            quantity: v === '' ? null : Number(v),
                          });
                        }}
                        placeholder='數量'
                        className='text-muted-foreground w-16 bg-transparent text-xs focus:outline-none'
                      />
                    </div>
                    <input
                      value={item.notes ?? ''}
                      onChange={e =>
                        updateItem(item.id, {
                          notes: e.target.value || null,
                        })
                      }
                      placeholder='補充說明'
                      className='text-muted-foreground min-w-0 flex-1 bg-transparent text-xs focus:outline-none'
                    />
                  </div>

                  <div className='flex items-center gap-3'>
                    <StorageCheckboxes
                      value={item.storage_location}
                      onChange={loc =>
                        updateItem(item.id, { storage_location: loc })
                      }
                    />
                  </div>

                  {/* Specs */}
                  <div className='border-border mt-1 space-y-1.5 border-l-2 pl-3'>
                    {item.specs.map((spec, specIdx) => (
                      <div key={spec.id} className='flex items-center gap-2'>
                        <span className='text-muted-foreground w-5 shrink-0 text-xs'>
                          {specIdx + 1}.
                        </span>
                        <input
                          value={spec.name}
                          onFocus={e => e.target.select()}
                          onChange={e =>
                            updateSpec(item.id, spec.id, {
                              name: e.target.value,
                            })
                          }
                          placeholder='規格名稱'
                          className='text-foreground/80 min-w-0 flex-1 bg-transparent text-xs focus:outline-none'
                        />
                        <StorageCheckboxes
                          value={spec.storage_location}
                          onChange={loc =>
                            updateSpec(item.id, spec.id, {
                              storage_location: loc,
                            })
                          }
                          compact
                        />
                        <button
                          onClick={() => deleteSpec(item.id, spec.id)}
                          className='text-muted-foreground hover:text-destructive shrink-0 rounded p-0.5 transition-colors'
                          aria-label='刪除規格'
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addSpec(item.id)}
                      className='text-muted-foreground hover:text-primary flex items-center gap-1 text-xs transition-colors'
                    >
                      <Plus size={11} />
                      新增規格
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive mt-0.5 shrink-0 rounded-md p-1 transition-colors'
                  aria-label='刪除項目'
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
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
