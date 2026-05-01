import { Package, Pencil, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  STORAGE_OPTIONS,
  hasStorageOption,
} from '@/components/checklist/checklistUtils';
import type { TripChecklist } from '@/types';
import { getTripChecklist, setCheck } from '@/utils/storage';

import CheckSaveBar from './tripChecklist/CheckSaveBar';
import TripChecklistEditModal from './tripChecklist/TripChecklistEditModal';

interface Props {
  tripId: number;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function TripChecklistPanel({ tripId, onDirtyChange }: Props) {
  const [checklist, setChecklist] = useState<TripChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [localChecks, setLocalChecks] = useState<
    Record<number, Record<number, boolean>>
  >({});
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

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

  if (loading || !checklist) {
    return (
      <div className='flex flex-1 items-center justify-center py-24'>
        <p className='text-muted-foreground animate-pulse text-sm'>載入中…</p>
      </div>
    );
  }

  if (checklist.categories.length === 0) {
    return (
      <div className='flex flex-1 items-center justify-center py-24 text-center'>
        <div>
          <p className='mb-2 text-4xl'>🧳</p>
          <p className='text-muted-foreground mb-4 text-sm'>
            尚未有任何分類，請點擊「編輯清單」以開始建立行李清單。
          </p>
          <button
            onClick={() => setShowEditModal(true)}
            className='border-border text-muted-foreground hover:border-primary hover:text-primary inline-flex items-center gap-1 rounded-lg border border-dashed px-3 py-1.5 text-xs transition-colors'
          >
            <Plus size={12} />
            編輯清單
          </button>
        </div>
        {showEditModal && (
          <TripChecklistEditModal
            tripId={tripId}
            checklist={checklist}
            onClose={() => setShowEditModal(false)}
            onSaved={() => void handleEditSaved()}
          />
        )}
      </div>
    );
  }

  const totalItems = checklist.categories.reduce(
    (sum, c) => sum + c.items.length,
    0,
  );

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      {/* Toolbar */}
      <div className='border-border flex shrink-0 items-center justify-between border-b px-4 py-2'>
        <span className='text-muted-foreground text-xs'>
          共 {totalItems} 項
        </span>
        <button
          onClick={() => setShowEditModal(true)}
          className='text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors'
        >
          <Pencil size={14} />
          編輯清單
        </button>
      </div>

      {/* Table */}
      <div className='flex-1 overflow-auto'>
        <div className='min-w-max'>
          <table className='w-full border-collapse text-sm'>
            <thead>
              <tr className='border-border border-b'>
                <th className='bg-background text-foreground sticky left-0 z-20 min-w-[220px] px-4 py-3 text-left font-semibold'>
                  項目
                </th>
                {checklist.occasions.map(occ => {
                  const checked = checklist.categories
                    .flatMap(c => c.items)
                    .filter(item => getCheck(occ.id, item.id)).length;
                  const pct = totalItems > 0 ? (checked / totalItems) * 100 : 0;
                  return (
                    <th
                      key={occ.id}
                      className='min-w-[120px] px-4 py-2 text-center align-top'
                    >
                      <div className='flex flex-col items-center gap-1'>
                        <span className='text-foreground text-sm font-semibold'>
                          {occ.name}
                        </span>
                        <span className='text-muted-foreground text-xs'>
                          {checked} / {totalItems}
                        </span>
                        <div className='bg-muted h-1 w-full overflow-hidden rounded-full'>
                          <div
                            className='bg-primary h-full rounded-full transition-all duration-300'
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </th>
                  );
                })}
                <th className='w-0' />
              </tr>
            </thead>

            <tbody>
              {checklist.categories.map(cat => (
                <>
                  {/* Category row */}
                  <tr
                    key={`cat-${cat.id}`}
                    className='border-border bg-muted/40 border-b'
                  >
                    <td
                      colSpan={checklist.occasions.length + 2}
                      className='bg-muted/40 sticky left-0 z-10 px-4 py-2'
                    >
                      <span className='text-muted-foreground text-xs font-semibold uppercase tracking-wide'>
                        {cat.name}
                      </span>
                    </td>
                  </tr>

                  {/* Item rows */}
                  {cat.items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`border-border hover:bg-accent/40 border-b transition-colors ${
                        idx % 2 === 0 ? '' : 'bg-muted/10'
                      }`}
                    >
                      <td className='bg-background group-hover:bg-accent/40 sticky left-0 z-10 px-4 py-3'>
                        <div className='flex flex-col gap-0.5'>
                          <div className='flex items-baseline gap-2'>
                            <span className='text-foreground text-sm font-medium'>
                              {item.name}
                            </span>
                            <span className='text-muted-foreground text-xs'>
                              {item.quantity ? `× ${item.quantity}` : '些許'}
                            </span>
                          </div>
                          {item.notes && (
                            <p className='text-muted-foreground text-xs'>
                              {item.notes}
                            </p>
                          )}
                          {item.storage_location && (
                            <div className='flex items-center gap-1.5'>
                              <Package
                                size={11}
                                className='text-muted-foreground'
                              />
                              {STORAGE_OPTIONS.filter(opt =>
                                hasStorageOption(item.storage_location, opt),
                              ).map(opt => (
                                <span
                                  key={opt}
                                  className='bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs'
                                >
                                  {opt}
                                </span>
                              ))}
                            </div>
                          )}
                          {(item.specs ?? []).length > 0 && (
                            <div className='border-border mt-0.5 space-y-0.5 border-l-2 pl-3'>
                              {(item.specs ?? []).map((spec, specIdx) => (
                                <div
                                  key={spec.id}
                                  className='flex flex-wrap items-center gap-x-1.5 gap-y-0.5'
                                >
                                  <span className='text-muted-foreground text-xs'>
                                    {specIdx + 1}.
                                  </span>
                                  <span className='text-foreground/80 text-xs'>
                                    {spec.name}
                                  </span>
                                  {spec.storage_location && (
                                    <>
                                      <Package
                                        size={9}
                                        className='text-muted-foreground'
                                      />
                                      {STORAGE_OPTIONS.filter(opt =>
                                        hasStorageOption(
                                          spec.storage_location,
                                          opt,
                                        ),
                                      ).map(opt => (
                                        <span
                                          key={opt}
                                          className='bg-primary/10 text-primary rounded px-1 py-0.5 text-xs'
                                        >
                                          {opt}
                                        </span>
                                      ))}
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {checklist.occasions.map(occ => (
                        <td
                          key={occ.id}
                          className='cursor-pointer px-4 py-2.5 text-center'
                          onClick={() => handleToggleCheck(occ.id, item.id)}
                        >
                          <label className='flex cursor-pointer items-center justify-center'>
                            <input
                              type='checkbox'
                              checked={getCheck(occ.id, item.id)}
                              onChange={() =>
                                handleToggleCheck(occ.id, item.id)
                              }
                              onClick={e => e.stopPropagation()}
                              className='border-border accent-primary size-4 cursor-pointer rounded'
                            />
                          </label>
                        </td>
                      ))}

                      <td />
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating save/discard bar */}
      {isDirty && (
        <CheckSaveBar
          saving={saving}
          onSave={() => void handleSaveChecks()}
          onDiscard={handleDiscardChecks}
        />
      )}

      {/* Edit modal */}
      {showEditModal && (
        <TripChecklistEditModal
          tripId={tripId}
          checklist={checklist}
          onClose={() => setShowEditModal(false)}
          onSaved={() => void handleEditSaved()}
        />
      )}
    </div>
  );
}
