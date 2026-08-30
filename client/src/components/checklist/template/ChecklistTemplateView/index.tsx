import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import LoadingIndicator from '@/components/ui/LoadingIndicator';
import { showToast } from '@/lib/toast';
import type { ChecklistCategory, ChecklistTemplate } from '@/types';
import {
  addTemplateCategory,
  deleteTemplateCategory,
  getChecklistTemplate,
} from '@/utils/storage';

import CategoryEditModal from '../CategoryEditModal';

import CategoryCard from './CategoryCard';

export default function ChecklistTemplateView() {
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [editingCat, setEditingCat] = useState<ChecklistCategory | null>(null);

  const reload = async () => {
    setTemplate(await getChecklistTemplate());
  };

  useEffect(() => {
    void reload();
  }, []);

  const handleAddCategory = async () => {
    try {
      await addTemplateCategory('新分類');
      await reload();
      showToast('success', '已新增分類。');
    } catch {
      showToast('error', '新增分類失敗，請稍後再試');
    }
  };

  const handleDeleteCategory = async (catId: number) => {
    try {
      await deleteTemplateCategory(catId);
      await reload();
      showToast('success', '已刪除分類。');
    } catch {
      showToast('error', '刪除分類失敗，請稍後再試');
    }
  };

  if (!template) {
    return <LoadingIndicator />;
  }

  return (
    <div className='space-y-3'>
      {template.categories.map(cat => (
        <CategoryCard
          key={cat.id}
          category={cat}
          onEdit={() => setEditingCat(cat)}
          onDelete={() => void handleDeleteCategory(cat.id)}
        />
      ))}

      <button
        onClick={() => void handleAddCategory()}
        className='border-border text-muted-foreground hover:border-primary hover:text-primary flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm transition-colors'
      >
        <Plus size={15} />
        新增分類
      </button>

      {editingCat && (
        <CategoryEditModal
          category={editingCat}
          onClose={() => setEditingCat(null)}
          onSaved={() => {
            void reload();
          }}
        />
      )}
    </div>
  );
}
