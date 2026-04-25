import { Package, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { ChecklistTemplate, ItemSpec } from '@/types';
import {
  addTemplateCategory,
  addTemplateItem,
  addTemplateItemSpec,
  deleteTemplateCategory,
  deleteTemplateItem,
  deleteTemplateItemSpec,
  getChecklistTemplate,
  updateTemplateCategory,
  updateTemplateItem,
  updateTemplateItemSpec,
} from '@/utils/storage';

type StorageOption = '託運' | '隨身';
const STORAGE_OPTIONS: StorageOption[] = ['託運', '隨身'];

type ItemFields = {
  name: string;
  quantity?: number | null;
  notes?: string | null;
  storage_location?: string | null;
};

function hasStorageOption(
  value: string | null | undefined,
  option: StorageOption,
): boolean {
  if (!value) {
    return false;
  }
  return value
    .split(',')
    .map(s => s.trim())
    .includes(option);
}

function toggleStorageOption(
  current: string | null | undefined,
  option: StorageOption,
): string | null {
  const parts = current
    ? current
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [];
  if (parts.includes(option)) {
    const next = parts.filter(p => p !== option);
    return next.length > 0 ? next.join(',') : null;
  }
  parts.push(option);
  return parts.join(',');
}

export default function ChecklistTemplateEditor() {
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);

  const reload = async () => {
    setTemplate(await getChecklistTemplate());
  };

  useEffect(() => {
    void reload();
  }, []);

  const handleAddCategory = async () => {
    await addTemplateCategory('新分類');
    await reload();
  };

  const handleDeleteCategory = async (catId: number) => {
    await deleteTemplateCategory(catId);
    await reload();
  };

  const handleCategoryBlur = async (catId: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    await updateTemplateCategory(catId, trimmed);
  };

  const handleAddItem = async (catId: number) => {
    await addTemplateItem(catId, { name: '新項目' });
    await reload();
  };

  const handleDeleteItem = async (catId: number, itemId: number) => {
    await deleteTemplateItem(catId, itemId);
    await reload();
  };

  const handleItemBlur = async (
    catId: number,
    itemId: number,
    field: 'name' | 'quantity' | 'notes',
    value: string,
    current: ItemFields,
  ) => {
    if (field === 'name') {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }
      await updateTemplateItem(catId, itemId, { ...current, name: trimmed });
    } else if (field === 'quantity') {
      const parsed = value.trim() === '' ? null : Number(value);
      if (value.trim() !== '' && isNaN(parsed as number)) {
        return;
      }
      await updateTemplateItem(catId, itemId, { ...current, quantity: parsed });
    } else {
      await updateTemplateItem(catId, itemId, {
        ...current,
        notes: value.trim() || null,
      });
    }
    await reload();
  };

  const handleItemStorageToggle = async (
    catId: number,
    itemId: number,
    option: StorageOption,
    current: ItemFields,
  ) => {
    const newValue = toggleStorageOption(current.storage_location, option);
    await updateTemplateItem(catId, itemId, {
      ...current,
      storage_location: newValue,
    });
    await reload();
  };

  const handleAddSpec = async (catId: number, itemId: number) => {
    await addTemplateItemSpec(catId, itemId, { name: '新規格' });
    await reload();
  };

  const handleDeleteSpec = async (
    catId: number,
    itemId: number,
    specId: number,
  ) => {
    await deleteTemplateItemSpec(catId, itemId, specId);
    await reload();
  };

  const handleSpecBlur = async (
    catId: number,
    itemId: number,
    specId: number,
    value: string,
    current: Pick<ItemSpec, 'name' | 'storage_location'>,
  ) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    await updateTemplateItemSpec(catId, itemId, specId, {
      ...current,
      name: trimmed,
    });
    await reload();
  };

  const handleSpecStorageToggle = async (
    catId: number,
    itemId: number,
    specId: number,
    option: StorageOption,
    current: Pick<ItemSpec, 'name' | 'storage_location'>,
  ) => {
    const newValue = toggleStorageOption(current.storage_location, option);
    await updateTemplateItemSpec(catId, itemId, specId, {
      ...current,
      storage_location: newValue,
    });
    await reload();
  };

  if (!template) {
    return (
      <p className='text-muted-foreground animate-pulse text-sm'>載入中…</p>
    );
  }

  return (
    <div className='space-y-3'>
      {template.categories.map(cat => (
        <div
          key={cat.id}
          className='border-border bg-card overflow-hidden rounded-xl border'
        >
          {/* Category header */}
          <div className='border-border bg-muted/40 flex items-center gap-2 border-b px-4 py-3'>
            <input
              defaultValue={cat.name}
              onBlur={e => void handleCategoryBlur(cat.id, e.target.value)}
              className='text-foreground min-w-0 flex-1 bg-transparent text-sm font-semibold focus:outline-none'
              placeholder='分類名稱'
            />
            <span className='text-muted-foreground text-xs'>
              {cat.items.length} 項
            </span>
            <button
              onClick={() => void handleDeleteCategory(cat.id)}
              className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md p-1 transition-colors'
              aria-label='刪除分類'
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Items */}
          <div className='divide-border divide-y'>
            {cat.items.map(item => (
              <div key={item.id} className='flex items-start gap-2 px-4 py-3'>
                <span className='text-muted-foreground mt-2 text-sm'>•</span>
                <div className='min-w-0 flex-1'>
                  {/* Name */}
                  <input
                    defaultValue={item.name}
                    onFocus={e => e.target.select()}
                    onBlur={e =>
                      void handleItemBlur(
                        cat.id,
                        item.id,
                        'name',
                        e.target.value,
                        item,
                      )
                    }
                    className='text-foreground w-full bg-transparent text-base font-medium focus:outline-none'
                    placeholder='項目名稱'
                  />

                  {/* Quantity + Notes */}
                  <div className='mt-1.5 flex items-center gap-3'>
                    <div className='flex items-center gap-1'>
                      <span className='text-muted-foreground text-sm'>x</span>
                      <input
                        type='number'
                        min={1}
                        defaultValue={item.quantity ?? ''}
                        onBlur={e =>
                          void handleItemBlur(
                            cat.id,
                            item.id,
                            'quantity',
                            e.target.value,
                            item,
                          )
                        }
                        placeholder='數量'
                        className='text-muted-foreground w-16 bg-transparent text-sm focus:outline-none'
                      />
                    </div>
                    <input
                      defaultValue={item.notes ?? ''}
                      onBlur={e =>
                        void handleItemBlur(
                          cat.id,
                          item.id,
                          'notes',
                          e.target.value,
                          item,
                        )
                      }
                      placeholder='補充說明'
                      className='text-muted-foreground min-w-0 flex-1 bg-transparent text-sm focus:outline-none'
                    />
                  </div>

                  {/* Storage location checkboxes */}
                  <div className='mt-1.5 flex items-center gap-3'>
                    <Package
                      size={13}
                      className='text-muted-foreground shrink-0'
                    />
                    {STORAGE_OPTIONS.map(option => (
                      <label
                        key={option}
                        className='flex cursor-pointer items-center gap-1'
                      >
                        <input
                          type='checkbox'
                          checked={hasStorageOption(
                            item.storage_location,
                            option,
                          )}
                          onChange={() =>
                            void handleItemStorageToggle(
                              cat.id,
                              item.id,
                              option,
                              item,
                            )
                          }
                          className='accent-primary size-3.5 cursor-pointer'
                        />
                        <span className='text-muted-foreground text-sm'>
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Specs */}
                  <div className='border-border mt-2 space-y-2 border-l-2 pl-3'>
                    {(item.specs ?? []).map((spec, specIdx) => (
                      <div key={spec.id} className='flex items-center gap-2'>
                        <span className='text-muted-foreground w-5 shrink-0 text-xs'>
                          {specIdx + 1}.
                        </span>
                        <input
                          defaultValue={spec.name}
                          onFocus={e => e.target.select()}
                          onBlur={e =>
                            void handleSpecBlur(
                              cat.id,
                              item.id,
                              spec.id,
                              e.target.value,
                              spec,
                            )
                          }
                          placeholder='規格名稱'
                          className='text-foreground/80 min-w-0 flex-1 bg-transparent text-sm focus:outline-none'
                        />
                        <Package
                          size={11}
                          className='text-muted-foreground shrink-0'
                        />
                        {STORAGE_OPTIONS.map(option => (
                          <label
                            key={option}
                            className='flex cursor-pointer items-center gap-1'
                          >
                            <input
                              type='checkbox'
                              checked={hasStorageOption(
                                spec.storage_location,
                                option,
                              )}
                              onChange={() =>
                                void handleSpecStorageToggle(
                                  cat.id,
                                  item.id,
                                  spec.id,
                                  option,
                                  spec,
                                )
                              }
                              className='accent-primary size-3 cursor-pointer'
                            />
                            <span className='text-muted-foreground text-xs'>
                              {option}
                            </span>
                          </label>
                        ))}
                        <button
                          onClick={() =>
                            void handleDeleteSpec(cat.id, item.id, spec.id)
                          }
                          className='text-muted-foreground hover:text-destructive shrink-0 rounded p-0.5 transition-colors'
                          aria-label='刪除規格'
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => void handleAddSpec(cat.id, item.id)}
                      className='text-muted-foreground hover:text-primary flex items-center gap-1 text-xs transition-colors'
                    >
                      <Plus size={11} />
                      新增規格
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => void handleDeleteItem(cat.id, item.id)}
                  className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive mt-1 rounded-md p-1 transition-colors'
                  aria-label='刪除項目'
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add item */}
          <div className='px-4 py-2'>
            <button
              onClick={() => void handleAddItem(cat.id)}
              className='text-muted-foreground hover:text-primary flex items-center gap-1.5 text-xs transition-colors'
            >
              <Plus size={13} />
              新增項目
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={() => void handleAddCategory()}
        className='border-border text-muted-foreground hover:border-primary hover:text-primary flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm transition-colors'
      >
        <Plus size={15} />
        新增分類
      </button>
    </div>
  );
}
