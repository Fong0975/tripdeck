import { checkKey, parseCheckKey } from '@tripdeck/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiError } from '@/api/client';
import { showToast } from '@/components/ui/toast';
import type { TripChecklist } from '@/types';
import {
  getTripChecklist,
  setCheck,
  setSpecCheck,
  syncTripChecklistFromTemplate,
} from '@/utils/storage';

import type { CheckGetter } from './checkUnits';
import {
  changedChecks,
  pruneLocalChecks,
  pruneLocalSpecChecks,
  type LocalChecks,
} from './localChecks';

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
  const [localSpecChecks, setLocalSpecChecks] = useState<LocalChecks>({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

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
    return checklist.occasions.some(
      occ =>
        changedChecks(localChecks[occ.id], occ.checks).length > 0 ||
        changedChecks(localSpecChecks[occ.id], occ.specChecks).length > 0,
    );
  }, [checklist, localChecks, localSpecChecks]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  const getCheck = useCallback<CheckGetter>(
    (occId, itemId, location) => {
      const key = checkKey(itemId, location);
      const local = localChecks[occId]?.[key];
      if (local !== undefined) {
        return local;
      }
      const occ = checklist?.occasions.find(o => o.id === occId);
      return !!occ?.checks[key];
    },
    [checklist, localChecks],
  );

  const getSpecCheck = useCallback<CheckGetter>(
    (occId, specId, location) => {
      const key = checkKey(specId, location);
      const local = localSpecChecks[occId]?.[key];
      if (local !== undefined) {
        return local;
      }
      const occ = checklist?.occasions.find(o => o.id === occId);
      return !!occ?.specChecks[key];
    },
    [checklist, localSpecChecks],
  );

  const handleToggleCheck = (
    occId: number,
    itemId: number,
    location: string,
  ) => {
    const current = getCheck(occId, itemId, location);
    setLocalChecks(prev => ({
      ...prev,
      [occId]: {
        ...(prev[occId] ?? {}),
        [checkKey(itemId, location)]: !current,
      },
    }));
  };

  const handleToggleSpecCheck = (
    occId: number,
    specId: number,
    location: string,
  ) => {
    const current = getSpecCheck(occId, specId, location);
    setLocalSpecChecks(prev => ({
      ...prev,
      [occId]: {
        ...(prev[occId] ?? {}),
        [checkKey(specId, location)]: !current,
      },
    }));
  };

  const handleSaveChecks = async () => {
    if (!checklist) {
      return;
    }
    setSaving(true);
    try {
      const itemIdBySpecId = new Map(
        checklist.categories.flatMap(c =>
          c.items.flatMap(item =>
            (item.specs ?? []).map((spec): [number, number] => [
              spec.id,
              item.id,
            ]),
          ),
        ),
      );
      const updates: Promise<void>[] = [];
      for (const occ of checklist.occasions) {
        for (const [key, checked] of changedChecks(
          localChecks[occ.id],
          occ.checks,
        )) {
          const parsed = parseCheckKey(key);
          if (parsed) {
            updates.push(
              setCheck(tripId, occ.id, parsed.id, parsed.location, checked),
            );
          }
        }
        for (const [key, checked] of changedChecks(
          localSpecChecks[occ.id],
          occ.specChecks,
        )) {
          const parsed = parseCheckKey(key);
          const itemId = parsed ? itemIdBySpecId.get(parsed.id) : undefined;
          if (parsed && itemId !== undefined) {
            updates.push(
              setSpecCheck(
                tripId,
                occ.id,
                itemId,
                parsed.id,
                parsed.location,
                checked,
              ),
            );
          }
        }
      }
      await Promise.all(updates);
      setLocalChecks({});
      setLocalSpecChecks({});
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
    setLocalSpecChecks({});
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
      setLocalSpecChecks(prev => pruneLocalSpecChecks(prev, fresh));
    } catch {
      showToast('error', '重新載入打包清單失敗，請稍後再試');
    }
  };

  /**
   * Copies the global template into a checklist without categories. A 409
   * means another session already filled the checklist, so it is reloaded
   * instead of reported as a failure. Always resolves.
   */
  const handleSyncTemplate = async () => {
    setSyncing(true);
    try {
      const synced = await syncTripChecklistFromTemplate(tripId);
      setChecklist(synced);
      if (synced.categories.length === 0) {
        showToast('info', '範本目前沒有內容，請先到首頁編輯範本。');
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        await handleEditSaved();
      } else {
        showToast('error', '同步範本失敗，請稍後再試');
      }
    } finally {
      setSyncing(false);
    }
  };

  return {
    checklist,
    loading,
    loadError,
    retryLoad: loadChecklist,
    saving,
    syncing,
    handleSyncTemplate,
    isDirty,
    getCheck,
    getSpecCheck,
    handleToggleCheck,
    handleToggleSpecCheck,
    handleSaveChecks,
    handleDiscardChecks,
    handleEditSaved,
  };
}
