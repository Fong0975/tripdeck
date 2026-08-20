import { Fragment } from 'react';

import type { TripChecklist } from '@/types';

import ChecklistItemRow from './ChecklistItemRow';

interface Props {
  checklist: TripChecklist;
  totalItems: number;
  getCheck: (occId: number, itemId: number) => boolean;
  onToggleCheck: (occId: number, itemId: number) => void;
}

export default function ChecklistTable({
  checklist,
  totalItems,
  getCheck,
  onToggleCheck,
}: Props) {
  return (
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
              <Fragment key={cat.id}>
                {/* Category row */}
                <tr className='border-border bg-muted/40 border-b'>
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
                  <ChecklistItemRow
                    key={item.id}
                    item={item}
                    index={idx}
                    occasions={checklist.occasions}
                    getCheck={getCheck}
                    onToggleCheck={onToggleCheck}
                  />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
