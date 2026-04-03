import { Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';

import type { ChecklistOccasion, TripChecklist } from '@/types';
import {
  getChecklistTemplate,
  getTripChecklist,
  initTripChecklist,
  saveTripChecklist,
} from '@/utils/storage';

interface Props {
  tripId: string;
}

export default function TripChecklistPanel({ tripId }: Props) {
  const [checklist, setChecklist] = useState<TripChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      let cl = await getTripChecklist(tripId);
      if (!cl) {
        const template = await getChecklistTemplate();
        cl = initTripChecklist(tripId, template);
        await saveTripChecklist(cl);
      }
      setChecklist(cl);
      setLoading(false);
    };
    void load();
  }, [tripId]);

  const persistName = (updated: TripChecklist) => {
    setChecklist(updated);
    if (nameTimer.current) {
      clearTimeout(nameTimer.current);
    }
    nameTimer.current = setTimeout(() => {
      void saveTripChecklist(updated);
    }, 400);
  };

  const toggleCheck = (occId: string, itemId: string) => {
    if (!checklist) {
      return;
    }
    const occ = checklist.occasions.find(o => o.id === occId);
    if (!occ) {
      return;
    }
    const updated: TripChecklist = {
      ...checklist,
      occasions: checklist.occasions.map(o =>
        o.id === occId
          ? { ...o, checks: { ...o.checks, [itemId]: !o.checks[itemId] } }
          : o,
      ),
    };
    setChecklist(updated);
    void saveTripChecklist(updated);
  };

  const updateOccasionName = (occId: string, name: string) => {
    if (!checklist) {
      return;
    }
    persistName({
      ...checklist,
      occasions: checklist.occasions.map(o =>
        o.id === occId ? { ...o, name } : o,
      ),
    });
  };

  const addOccasion = () => {
    if (!checklist) {
      return;
    }
    const newOcc: ChecklistOccasion = {
      id: uuid(),
      name: '新時機',
      checks: {},
    };
    const updated: TripChecklist = {
      ...checklist,
      occasions: [...checklist.occasions, newOcc],
    };
    setChecklist(updated);
    void saveTripChecklist(updated);
  };

  const deleteOccasion = (occId: string) => {
    if (!checklist) {
      return;
    }
    const updated: TripChecklist = {
      ...checklist,
      occasions: checklist.occasions.filter(o => o.id !== occId),
    };
    setChecklist(updated);
    void saveTripChecklist(updated);
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
          <p className='text-muted-foreground text-sm'>
            尚未設定行李清單模板，請先至首頁新增分類與項目。
          </p>
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
              <th className='bg-background text-foreground sticky left-0 z-20 min-w-[160px] px-4 py-3 text-left font-semibold'>
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
                          value={occ.name}
                          onChange={e =>
                            updateOccasionName(occ.id, e.target.value)
                          }
                          className='text-foreground w-20 bg-transparent text-center text-sm font-semibold focus:outline-none'
                        />
                        {checklist.occasions.length > 1 && (
                          <button
                            onClick={() => deleteOccasion(occ.id)}
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
                  onClick={addOccasion}
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
                  className='border-border bg-muted/40 border-b'
                >
                  <td
                    colSpan={checklist.occasions.length + 2}
                    className='bg-muted/40 text-muted-foreground sticky left-0 z-10 px-4 py-2 text-xs font-semibold uppercase tracking-wide'
                  >
                    {cat.name}
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
                    {/* Item name - sticky */}
                    <td className='bg-background text-foreground hover:bg-accent/40 sticky left-0 z-10 px-4 py-2.5'>
                      {item.name}
                    </td>

                    {/* Checkboxes per occasion */}
                    {checklist.occasions.map(occ => (
                      <td
                        key={occ.id}
                        className='px-4 py-2.5 text-center'
                        onClick={() => toggleCheck(occ.id, item.id)}
                      >
                        <label className='flex cursor-pointer items-center justify-center'>
                          <input
                            type='checkbox'
                            checked={!!occ.checks[item.id]}
                            onChange={() => toggleCheck(occ.id, item.id)}
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
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
