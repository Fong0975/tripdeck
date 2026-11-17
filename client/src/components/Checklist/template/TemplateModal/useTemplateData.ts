import { useCallback, useEffect, useState } from 'react';

import { showToast } from '@/components/ui/toast';
import type { ChecklistCategory, ChecklistTemplate } from '@/types';
import {
  addTemplateCategory,
  deleteTemplateCategory,
  getChecklistTemplate,
  reorderTemplateCategories,
} from '@/utils/storage';

import { reorderById } from '../../shared/editStateUpdaters';

/**
 * Loads the checklist template and exposes category-level mutations that
 * reload it afterwards and report the outcome with a toast.
 *
 * @returns `template` (null until the first load succeeds), `loadError`,
 *   `reload`, `addCategory` (resolves to the created category, or null on
 *   failure), `deleteCategory` (resolves to whether it succeeded) and
 *   `reorderCategories`, which shows the new order immediately and saves it,
 *   reloading the stored order if saving fails.
 */
export function useTemplateData() {
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    try {
      setTemplate(await getChecklistTemplate());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void reload();
  }, [reload]);

  const addCategory = async (): Promise<ChecklistCategory | null> => {
    try {
      const created = await addTemplateCategory('新分類');
      await reload();
      showToast('success', '已新增分類。');
      return created;
    } catch {
      showToast('error', '新增分類失敗，請稍後再試');
      return null;
    }
  };

  const deleteCategory = async (catId: number): Promise<boolean> => {
    try {
      await deleteTemplateCategory(catId);
      await reload();
      showToast('success', '已刪除分類。');
      return true;
    } catch {
      showToast('error', '刪除分類失敗，請稍後再試');
      return false;
    }
  };

  const reorderCategories = async (activeId: number, overId: number) => {
    if (!template) {
      return;
    }
    const categories = reorderById(template.categories, activeId, overId);
    if (categories === template.categories) {
      return;
    }
    setTemplate({ ...template, categories });
    try {
      await reorderTemplateCategories(categories.map(c => c.id));
    } catch {
      showToast('error', '調整分類順序失敗，請稍後再試');
      await reload();
    }
  };

  return {
    template,
    loadError,
    reload,
    addCategory,
    deleteCategory,
    reorderCategories,
  };
}
