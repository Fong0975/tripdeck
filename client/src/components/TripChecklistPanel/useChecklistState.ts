import { useCallback, useEffect, useMemo, useState } from 'react';

import { showToast } from '@/components/ui/toast';
import type { TripChecklist } from '@/types';
import { getTripChecklist, setCheck } from '@/utils/storage';

import { pruneLocalChecks, type LocalChecks } from './localChecks';

/**
 * Loads a trip's checklist and manages local (unsaved) check-state edits,
 * including dirty tracking and save/discard actions. Leaving the page while
 * dirty is guarded by the parent through `onDirtyChange` (see
 * useUnsavedChangesGuard, which also owns the beforeunload warning).
 *
 * A failed initial load sets `loadError` (with `retryLoad` to try again)
 * instead of leaving the caller on a permanent loading state.
 *
 * @param tripId The trip whose checklist to load.
 * @param onDirtyChange Notified whenever the unsaved state changes, and with
 *   `false` on unmount so a parent flag never outlives the panel.
 */
export function useChecklistState(
  tripId: number,
  onDirtyChange?: (dirty: boolean) => void,
) {
  const [checklist, setChecklist] = useState<TripChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [localChecks, setLocalChecks] = useState<LocalChecks>({});
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setChecklist(await getTripChecklist(tripId));
  }, [tripId]);

  const loadChecklist = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      await reload();
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [reload]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void loadChecklist();
  }, [loadChecklist]);

  const isDirty = useMemo(() => {
    if (!checklist) {
      return false;
    }
    for (const occ of checklist.occasions) {
      const local = localChecks[occ.id] ?? {};
      for (const [itemIdStr, localVal] of Object.entries(local)) {
        const savedVal = !!occ.checks[Number(itemIdStr)];
        if (localVal !== savedVal) {
          return true;
        }
      }
    }
    return false;
  }, [checklist, localChecks]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  const getCheck = useCallback(
    (occId: number, itemId: number): boolean => {
      const local = localChecks[occId]?.[itemId];
      if (local !== undefined) {
        return local;
      }
      const occ = checklist?.occasions.find(o => o.id === occId);
      return !!occ?.checks[itemId];
    },
    [checklist, localChecks],
  );

  const handleToggleCheck = (occId: number, itemId: number) => {
    const current = getCheck(occId, itemId);
    setLocalChecks(prev => ({
      ...prev,
      [occId]: { ...(prev[occId] ?? {}), [itemId]: !current },
    }));
  };

  const handleSaveChecks = async () => {
    if (!checklist) {
      return;
    }
    setSaving(true);
    try {
      const updates: Promise<void>[] = [];
      for (const occ of checklist.occasions) {
        const local = localChecks[occ.id] ?? {};
        for (const [itemIdStr, localVal] of Object.entries(local)) {
          const itemId = Number(itemIdStr);
          if (localVal !== !!occ.checks[itemId]) {
            updates.push(setCheck(tripId, occ.id, itemId, localVal));
          }
        }
      }
      await Promise.all(updates);
      setLocalChecks({});
      await reload();
      showToast('success', '已儲存打包清單勾選。');
    } catch {
      showToast('error', '儲存打包清單勾選失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChecks = () => {
    setLocalChecks({});
  };

  /**
   * Reloads after a checklist structure edit, keeping unsaved checks for
   * items that still exist and dropping only those for removed items or
   * occasions. Always resolves; a failed reload keeps the current state and
   * shows an error toast.
   */
  const handleEditSaved = async () => {
    try {
      const fresh = await getTripChecklist(tripId);
      setChecklist(fresh);
      setLocalChecks(prev => pruneLocalChecks(prev, fresh));
    } catch {
      showToast('error', '重新載入打包清單失敗，請稍後再試');
    }
  };

  return {
    checklist,
    loading,
    loadError,
    retryLoad: loadChecklist,
    saving,
    isDirty,
    getCheck,
    handleToggleCheck,
    handleSaveChecks,
    handleDiscardChecks,
    handleEditSaved,
  };
}
