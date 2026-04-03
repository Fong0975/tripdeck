import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';

import type { ChecklistCategory, ChecklistTemplate } from '@/types';
import { getChecklistTemplate, saveChecklistTemplate } from '@/utils/storage';

export default function ChecklistTemplateEditor() {
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void getChecklistTemplate().then(t => setTemplate(t));
  }, []);

  const persist = (updated: ChecklistTemplate) => {
    setTemplate(updated);
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      void saveChecklistTemplate(updated);
    }, 400);
  };

  const updateCategoryName = (catId: string, name: string) => {
    if (!template) {
      return;
    }
    persist({
      categories: template.categories.map(c =>
        c.id === catId ? { ...c, name } : c,
      ),
    });
  };

  const deleteCategory = (catId: string) => {
    if (!template) {
      return;
    }
    const updated = {
      categories: template.categories.filter(c => c.id !== catId),
    };
    setTemplate(updated);
    void saveChecklistTemplate(updated);
  };

  const addCategory = () => {
    if (!template) {
      return;
    }
    const newCat: ChecklistCategory = {
      id: uuid(),
      name: '新分類',
      items: [],
    };
    const updated = { categories: [...template.categories, newCat] };
    setTemplate(updated);
    void saveChecklistTemplate(updated);
  };

  const updateItemName = (catId: string, itemId: string, name: string) => {
    if (!template) {
      return;
    }
    persist({
      categories: template.categories.map(c =>
        c.id === catId
          ? {
              ...c,
              items: c.items.map(it =>
                it.id === itemId ? { ...it, name } : it,
              ),
            }
          : c,
      ),
    });
  };

  const deleteItem = (catId: string, itemId: string) => {
    if (!template) {
      return;
    }
    const updated = {
      categories: template.categories.map(c =>
        c.id === catId
          ? { ...c, items: c.items.filter(it => it.id !== itemId) }
          : c,
      ),
    };
    setTemplate(updated);
    void saveChecklistTemplate(updated);
  };

  const addItem = (catId: string) => {
    if (!template) {
      return;
    }
    const newItem = { id: uuid(), name: '新項目' };
    const updated = {
      categories: template.categories.map(c =>
        c.id === catId ? { ...c, items: [...c.items, newItem] } : c,
      ),
    };
    setTemplate(updated);
    void saveChecklistTemplate(updated);
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
              value={cat.name}
              onChange={e => updateCategoryName(cat.id, e.target.value)}
              className='text-foreground min-w-0 flex-1 bg-transparent text-sm font-semibold focus:outline-none'
              placeholder='分類名稱'
            />
            <span className='text-muted-foreground text-xs'>
              {cat.items.length} 項
            </span>
            <button
              onClick={() => deleteCategory(cat.id)}
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
                  value={item.name}
                  onChange={e =>
                    updateItemName(cat.id, item.id, e.target.value)
                  }
                  className='text-foreground min-w-0 flex-1 bg-transparent text-sm focus:outline-none'
                  placeholder='項目名稱'
                />
                <button
                  onClick={() => deleteItem(cat.id, item.id)}
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
              onClick={() => addItem(cat.id)}
              className='text-muted-foreground hover:text-primary flex items-center gap-1.5 text-xs transition-colors'
            >
              <Plus size={13} />
              新增項目
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addCategory}
        className='border-border text-muted-foreground hover:border-primary hover:text-primary flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm transition-colors'
      >
        <Plus size={15} />
        新增分類
      </button>
    </div>
  );
}
