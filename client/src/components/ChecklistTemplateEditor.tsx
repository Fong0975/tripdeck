import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { ChecklistTemplate } from '@/types';
import {
  addTemplateCategory,
  addTemplateItem,
  deleteTemplateCategory,
  deleteTemplateItem,
  getChecklistTemplate,
  updateTemplateCategory,
  updateTemplateItem,
} from '@/utils/storage';

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
    await addTemplateItem(catId, '新項目');
    await reload();
  };

  const handleDeleteItem = async (catId: number, itemId: number) => {
    await deleteTemplateItem(catId, itemId);
    await reload();
  };

  const handleItemBlur = async (
    catId: number,
    itemId: number,
    name: string,
  ) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    await updateTemplateItem(catId, itemId, trimmed);
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
              <div key={item.id} className='flex items-center gap-2 px-4 py-2'>
                <span className='text-muted-foreground text-xs'>•</span>
                <input
                  defaultValue={item.name}
                  onBlur={e =>
                    void handleItemBlur(cat.id, item.id, e.target.value)
                  }
                  className='text-foreground min-w-0 flex-1 bg-transparent text-sm focus:outline-none'
                  placeholder='項目名稱'
                />
                <button
                  onClick={() => void handleDeleteItem(cat.id, item.id)}
                  className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md p-1 transition-colors'
                  aria-label='刪除項目'
                >
                  <Trash2 size={12} />
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
