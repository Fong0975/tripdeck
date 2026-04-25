import { Package, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { ItemSpec, TripChecklist } from '@/types';
import {
  addOccasion,
  addTripCategory,
  addTripItem,
  addTripItemSpec,
  deleteOccasion,
  deleteTripCategory,
  deleteTripItem,
  deleteTripItemSpec,
  getTripChecklist,
  setCheck,
  updateOccasion,
  updateTripCategory,
  updateTripItem,
  updateTripItemSpec,
} from '@/utils/storage';

type StorageOption = '託運' | '隨身';
const STORAGE_OPTIONS: StorageOption[] = ['託運', '隨身'];

function hasStorageOption(
  value: string | null | undefined,
  option: StorageOption,
): boolean {
  if (!value) {
    return false;
  }
  return value
    .split(',')
    .map(s => s.trim())
    .includes(option);
}

function toggleStorageOption(
  current: string | null | undefined,
  option: StorageOption,
): string | null {
  const parts = current
    ? current
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [];
  if (parts.includes(option)) {
    const next = parts.filter(p => p !== option);
    return next.length > 0 ? next.join(',') : null;
  }
  parts.push(option);
  return parts.join(',');
}

interface Props {
  tripId: number;
}

export default function TripChecklistPanel({ tripId }: Props) {
  const [checklist, setChecklist] = useState<TripChecklist | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setChecklist(await getTripChecklist(tripId));
  }, [tripId]);

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

  const handleToggleCheck = async (occId: number, itemId: number) => {
    if (!checklist) {
      return;
    }
    const occ = checklist.occasions.find(o => o.id === occId);
    if (!occ) {
      return;
    }
    const newChecked = !occ.checks[itemId];
    setChecklist({
      ...checklist,
      occasions: checklist.occasions.map(o =>
        o.id === occId
          ? { ...o, checks: { ...o.checks, [itemId]: newChecked } }
          : o,
      ),
    });
    await setCheck(tripId, occId, itemId, newChecked);
  };

  const handleOccasionBlur = async (occId: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    await updateOccasion(tripId, occId, trimmed);
  };

  const handleAddOccasion = async () => {
    await addOccasion(tripId, '新時機');
    await reload();
  };

  const handleDeleteOccasion = async (occId: number) => {
    await deleteOccasion(tripId, occId);
    await reload();
  };

  const handleAddItem = async (catId: number) => {
    await addTripItem(tripId, catId, { name: '新項目' });
    await reload();
  };

  const handleDeleteItem = async (itemId: number) => {
    await deleteTripItem(tripId, itemId);
    await reload();
  };

  const handleItemNameBlur = async (itemId: number, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    await updateTripItem(tripId, itemId, { name: trimmed });
    await reload();
  };

  const handleItemQuantityBlur = async (itemId: number, value: string) => {
    const parsed = value.trim() === '' ? null : Number(value);
    if (value.trim() !== '' && isNaN(parsed as number)) {
      return;
    }
    await updateTripItem(tripId, itemId, { quantity: parsed });
    await reload();
  };

  const handleItemNotesBlur = async (itemId: number, value: string) => {
    await updateTripItem(tripId, itemId, { notes: value.trim() || null });
    await reload();
  };

  const handleItemStorageToggle = async (
    itemId: number,
    option: StorageOption,
    currentStorage: string | null | undefined,
  ) => {
    const newValue = toggleStorageOption(currentStorage, option);
    await updateTripItem(tripId, itemId, { storage_location: newValue });
    await reload();
  };

  const handleAddCategory = async () => {
    await addTripCategory(tripId, '新分類');
    await reload();
  };

  const handleDeleteCategory = async (catId: number) => {
    await deleteTripCategory(tripId, catId);
    await reload();
  };

  const handleCategoryNameBlur = async (catId: number, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    await updateTripCategory(tripId, catId, trimmed);
  };

  const handleAddSpec = async (itemId: number) => {
    await addTripItemSpec(tripId, itemId, { name: '新規格' });
    await reload();
  };

  const handleDeleteSpec = async (itemId: number, specId: number) => {
    await deleteTripItemSpec(tripId, itemId, specId);
    await reload();
  };

  const handleSpecBlur = async (
    itemId: number,
    specId: number,
    value: string,
    current: Pick<ItemSpec, 'name' | 'storage_location'>,
  ) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    await updateTripItemSpec(tripId, itemId, specId, {
      ...current,
      name: trimmed,
    });
    await reload();
  };

  const handleSpecStorageToggle = async (
    itemId: number,
    specId: number,
    option: StorageOption,
    current: Pick<ItemSpec, 'name' | 'storage_location'>,
  ) => {
    const newValue = toggleStorageOption(current.storage_location, option);
    await updateTripItemSpec(tripId, itemId, specId, {
      ...current,
      storage_location: newValue,
    });
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
            尚未有任何分類，請新增分類以開始建立行李清單。
          </p>
          <button
            onClick={() => void handleAddCategory()}
            className='border-border text-muted-foreground hover:border-primary hover:text-primary inline-flex items-center gap-1 rounded-lg border border-dashed px-3 py-1.5 text-xs transition-colors'
          >
            <Plus size={12} />
            新增分類
          </button>
        </div>
      </div>
    );
  }

  const totalItems = checklist.categories.reduce(
    (sum, c) => sum + c.items.length,
    0,
  );

  return (
    <div className='flex-1 overflow-auto'>
      <div className='min-w-max'>
        <table className='w-full border-collapse text-sm'>
          <thead>
            <tr className='border-border border-b'>
              {/* Fixed left header */}
              <th className='bg-background text-foreground sticky left-0 z-20 min-w-[220px] px-4 py-3 text-left font-semibold'>
                項目
              </th>

              {/* Occasion columns */}
              {checklist.occasions.map(occ => {
                const checked = Object.values(occ.checks).filter(
                  Boolean,
                ).length;
                const pct = totalItems > 0 ? (checked / totalItems) * 100 : 0;
                return (
                  <th
                    key={occ.id}
                    className='min-w-[120px] px-4 py-2 text-center align-top'
                  >
                    <div className='flex flex-col items-center gap-1'>
                      <div className='flex items-center gap-1'>
                        <input
                          defaultValue={occ.name}
                          onBlur={e =>
                            void handleOccasionBlur(occ.id, e.target.value)
                          }
                          className='text-foreground w-20 bg-transparent text-center text-sm font-semibold focus:outline-none'
                        />
                        {checklist.occasions.length > 1 && (
                          <button
                            onClick={() => void handleDeleteOccasion(occ.id)}
                            className='text-muted-foreground hover:text-destructive rounded p-0.5'
                            aria-label='刪除時機'
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
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

              {/* Add occasion button */}
              <th className='p-3'>
                <button
                  onClick={() => void handleAddOccasion()}
                  className='border-border text-muted-foreground hover:border-primary hover:text-primary flex items-center gap-1 rounded-lg border border-dashed px-2 py-1 text-xs transition-colors'
                >
                  <Plus size={12} />
                  新增時機
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {checklist.categories.map(cat => (
              <>
                {/* Category header row */}
                <tr
                  key={`cat-${cat.id}`}
                  className='border-border bg-muted/40 group/cat border-b'
                >
                  <td
                    colSpan={checklist.occasions.length + 2}
                    className='bg-muted/40 sticky left-0 z-10 px-4 py-2'
                  >
                    <div className='flex items-center gap-2'>
                      <input
                        defaultValue={cat.name}
                        onBlur={e =>
                          void handleCategoryNameBlur(cat.id, e.target.value)
                        }
                        className='text-muted-foreground min-w-0 flex-1 bg-transparent text-xs font-semibold uppercase tracking-wide focus:outline-none'
                      />
                      <button
                        onClick={() => void handleDeleteCategory(cat.id)}
                        className='text-muted-foreground hover:text-destructive shrink-0 rounded p-0.5 opacity-0 transition-all group-hover/cat:opacity-100'
                        aria-label='刪除分類'
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Item rows */}
                {cat.items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-border hover:bg-accent/40 group border-b transition-colors ${
                      idx % 2 === 0 ? '' : 'bg-muted/10'
                    }`}
                  >
                    {/* Item info - sticky left */}
                    <td className='bg-background text-foreground group-hover:bg-accent/40 sticky left-0 z-10 px-4 py-3'>
                      <div className='flex flex-col gap-1'>
                        {/* Name + delete */}
                        <div className='flex items-center gap-1'>
                          <input
                            defaultValue={item.name}
                            onFocus={e => e.target.select()}
                            onBlur={e =>
                              void handleItemNameBlur(item.id, e.target.value)
                            }
                            className='text-foreground min-w-0 flex-1 bg-transparent text-base font-medium focus:outline-none'
                          />
                          <button
                            onClick={() => void handleDeleteItem(item.id)}
                            className='text-muted-foreground hover:text-destructive shrink-0 rounded p-0.5 opacity-0 transition-all group-hover:opacity-100'
                            aria-label='刪除項目'
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Quantity + Notes */}
                        <div className='flex items-center gap-2'>
                          <div className='flex items-center gap-1'>
                            <span className='text-muted-foreground text-sm'>
                              x
                            </span>
                            <input
                              type='number'
                              min={1}
                              defaultValue={item.quantity ?? ''}
                              onBlur={e =>
                                void handleItemQuantityBlur(
                                  item.id,
                                  e.target.value,
                                )
                              }
                              placeholder='數量'
                              className='text-muted-foreground w-14 bg-transparent text-sm focus:outline-none focus:ring-0'
                            />
                          </div>
                          <input
                            defaultValue={item.notes ?? ''}
                            onBlur={e =>
                              void handleItemNotesBlur(item.id, e.target.value)
                            }
                            placeholder='補充說明'
                            className='text-muted-foreground min-w-0 flex-1 bg-transparent text-sm focus:outline-none focus:ring-0'
                          />
                        </div>

                        {/* Storage location */}
                        <div className='flex items-center gap-3'>
                          <Package
                            size={13}
                            className='text-muted-foreground shrink-0'
                          />
                          {STORAGE_OPTIONS.map(option => (
                            <label
                              key={option}
                              className='flex cursor-pointer items-center gap-1'
                            >
                              <input
                                type='checkbox'
                                checked={hasStorageOption(
                                  item.storage_location,
                                  option,
                                )}
                                onChange={() =>
                                  void handleItemStorageToggle(
                                    item.id,
                                    option,
                                    item.storage_location,
                                  )
                                }
                                className='accent-primary size-3.5 cursor-pointer'
                              />
                              <span className='text-muted-foreground text-sm'>
                                {option}
                              </span>
                            </label>
                          ))}
                        </div>

                        {/* Specs */}
                        <div className='border-border mt-1 space-y-2 border-l-2 pl-3'>
                          {(item.specs ?? []).map((spec, specIdx) => (
                            <div
                              key={spec.id}
                              className='flex items-center gap-2'
                            >
                              <span className='text-muted-foreground w-5 shrink-0 text-xs'>
                                {specIdx + 1}.
                              </span>
                              <input
                                defaultValue={spec.name}
                                onFocus={e => e.target.select()}
                                onBlur={e =>
                                  void handleSpecBlur(
                                    item.id,
                                    spec.id,
                                    e.target.value,
                                    spec,
                                  )
                                }
                                placeholder='規格名稱'
                                className='text-foreground/80 min-w-0 flex-1 bg-transparent text-sm focus:outline-none focus:ring-0'
                              />
                              <Package
                                size={11}
                                className='text-muted-foreground shrink-0'
                              />
                              {STORAGE_OPTIONS.map(option => (
                                <label
                                  key={option}
                                  className='flex cursor-pointer items-center gap-1'
                                >
                                  <input
                                    type='checkbox'
                                    checked={hasStorageOption(
                                      spec.storage_location,
                                      option,
                                    )}
                                    onChange={() =>
                                      void handleSpecStorageToggle(
                                        item.id,
                                        spec.id,
                                        option,
                                        spec,
                                      )
                                    }
                                    className='accent-primary size-3 cursor-pointer'
                                  />
                                  <span className='text-muted-foreground text-xs'>
                                    {option}
                                  </span>
                                </label>
                              ))}
                              <button
                                onClick={() =>
                                  void handleDeleteSpec(item.id, spec.id)
                                }
                                className='text-muted-foreground hover:text-destructive shrink-0 rounded p-0.5 opacity-0 transition-all group-hover:opacity-100'
                                aria-label='刪除規格'
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => void handleAddSpec(item.id)}
                            className='text-muted-foreground hover:text-primary flex items-center gap-0.5 text-xs opacity-0 transition-colors group-hover:opacity-100'
                          >
                            <Plus size={11} />
                            新增規格
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Checkboxes per occasion */}
                    {checklist.occasions.map(occ => (
                      <td
                        key={occ.id}
                        className='px-4 py-2.5 text-center'
                        onClick={() => void handleToggleCheck(occ.id, item.id)}
                      >
                        <label className='flex cursor-pointer items-center justify-center'>
                          <input
                            type='checkbox'
                            checked={!!occ.checks[item.id]}
                            onChange={() =>
                              void handleToggleCheck(occ.id, item.id)
                            }
                            onClick={e => e.stopPropagation()}
                            className='border-border accent-primary size-4 cursor-pointer rounded'
                          />
                        </label>
                      </td>
                    ))}

                    {/* Empty cell for the add-occasion column */}
                    <td />
                  </tr>
                ))}

                {/* Add item row per category */}
                <tr key={`add-${cat.id}`} className='border-border border-b'>
                  <td className='bg-background sticky left-0 z-10 px-4 py-1.5'>
                    <button
                      onClick={() => void handleAddItem(cat.id)}
                      className='text-muted-foreground hover:text-primary flex items-center gap-1 text-xs transition-colors'
                    >
                      <Plus size={12} />
                      新增項目
                    </button>
                  </td>
                  {checklist.occasions.map(occ => (
                    <td key={occ.id} />
                  ))}
                  <td />
                </tr>
              </>
            ))}

            {/* Add category row */}
            <tr>
              <td
                colSpan={checklist.occasions.length + 2}
                className='bg-background sticky left-0 z-10 px-4 py-2'
              >
                <button
                  onClick={() => void handleAddCategory()}
                  className='border-border text-muted-foreground hover:border-primary hover:text-primary flex items-center gap-1 rounded-lg border border-dashed px-2 py-1 text-xs transition-colors'
                >
                  <Plus size={12} />
                  新增分類
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
