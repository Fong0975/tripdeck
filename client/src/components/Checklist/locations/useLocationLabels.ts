import type { LocationLabelsResponse } from '@tripdeck/shared';
import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '@/api/client';
import { showToast } from '@/components/ui/toast';
import {
  addLocationLabel,
  deleteLocationLabel,
  getLocationLabels,
  reorderLocationLabels,
  updateLocationLabel,
} from '@/utils/storage';

import { reorderById } from '../shared/editStateUpdaters';

/**
 * Loads the location labels with the deleted names that trips still use, and
 * exposes the mutations. Each mutation reloads afterwards and reports its
 * outcome with a toast.
 *
 * @returns `data` (null until the first load succeeds), `loadError`,
 *   `reload`, and the mutations: `addLabel` and `removeLabel` resolve to
 *   whether they succeeded, `setShowAsGroup` toggles the group flag, and
 *   `moveLabel` shows the new order immediately and saves it, reloading the
 *   stored order if saving fails.
 */
export function useLocationLabels() {
  const [data, setData] = useState<LocationLabelsResponse | null>(null);
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    try {
      setData(await getLocationLabels());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void reload();
  }, [reload]);

  const addLabel = async (
    name: string,
    showAsGroup: boolean,
  ): Promise<boolean> => {
    try {
      await addLocationLabel({ name, show_as_group: showAsGroup });
      await reload();
      showToast('success', '已新增存放位置。');
      return true;
    } catch (err) {
      const duplicate = err instanceof ApiError && err.status === 409;
      showToast(
        'error',
        duplicate ? '已有同名的存放位置' : '新增存放位置失敗，請稍後再試',
      );
      return false;
    }
  };

  const removeLabel = async (labelId: number): Promise<boolean> => {
    try {
      await deleteLocationLabel(labelId);
      await reload();
      showToast('success', '已刪除存放位置。');
      return true;
    } catch {
      showToast('error', '刪除存放位置失敗，請稍後再試');
      return false;
    }
  };

  const setShowAsGroup = async (labelId: number, showAsGroup: boolean) => {
    try {
      await updateLocationLabel(labelId, { show_as_group: showAsGroup });
      await reload();
    } catch {
      showToast('error', '更新存放位置失敗，請稍後再試');
    }
  };

  const moveLabel = async (labelId: number, direction: -1 | 1) => {
    if (!data) {
      return;
    }
    const index = data.labels.findIndex(label => label.id === labelId);
    const neighbour = data.labels[index + direction];
    if (index < 0 || !neighbour) {
      return;
    }
    const labels = reorderById(data.labels, labelId, neighbour.id);
    setData({ ...data, labels });
    try {
      await reorderLocationLabels(labels.map(label => label.id));
    } catch {
      showToast('error', '調整存放位置順序失敗，請稍後再試');
      await reload();
    }
  };

  return {
    data,
    loadError,
    reload,
    addLabel,
    removeLabel,
    setShowAsGroup,
    moveLabel,
  };
}
