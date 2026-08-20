import { useCallback, useEffect, useMemo, useState } from 'react';

import type { TripChecklist } from '@/types';
import { getTripChecklist, setCheck } from '@/utils/storage';

/**
 * Loads a trip's checklist and manages local (unsaved) check-state edits,
 * including dirty tracking, a beforeunload guard, and save/discard actions.
 */
export function useChecklistState(
  tripId: number,
  onDirtyChange?: (dirty: boolean) => void,
) {
  const [checklist, setChecklist] = useState<TripChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [localChecks, setLocalChecks] = useState<
    Record<number, Record<number, boolean>>
  >({});
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setChecklist(await getTripChecklist(tripId));
  }, [tripId]);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

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
    if (!isDirty) {
      return;
    }
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

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
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChecks = () => {
    setLocalChecks({});
  };

  const handleEditSaved = async () => {
    setLocalChecks({});
    await reload();
  };

  return {
    checklist,
    loading,
    saving,
    isDirty,
    getCheck,
    handleToggleCheck,
    handleSaveChecks,
    handleDiscardChecks,
    handleEditSaved,
  };
}
