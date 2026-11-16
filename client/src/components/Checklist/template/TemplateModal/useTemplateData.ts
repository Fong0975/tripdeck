import { useCallback, useEffect, useState } from 'react';

import { showToast } from '@/components/ui/toast';
import type { ChecklistCategory, ChecklistTemplate } from '@/types';
import {
  addTemplateCategory,
  deleteTemplateCategory,
  getChecklistTemplate,
} from '@/utils/storage';

/**
 * Loads the checklist template and exposes category-level mutations that
 * reload it afterwards and report the outcome with a toast.
 *
 * @returns `template` (null until the first load succeeds), `loadError`,
 *   `reload`, `addCategory` (resolves to the created category, or null on
 *   failure) and `deleteCategory` (resolves to whether it succeeded).
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

  return { template, loadError, reload, addCategory, deleteCategory };
}
