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
            <tr className='border-b border-border'>
              <th className='sticky left-0 z-20 min-w-55 bg-background px-4 py-3 text-left font-semibold text-foreground'>
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
                    className='min-w-30 px-4 py-2 text-center align-top'
                  >
                    <div className='flex flex-col items-center gap-1'>
                      <span className='text-sm font-semibold text-foreground'>
                        {occ.name}
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        {checked} / {totalItems}
                      </span>
                      <div className='h-1 w-full overflow-hidden rounded-full bg-muted'>
                        <div
                          className='h-full rounded-full bg-primary transition-all duration-300'
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
                <tr className='border-b border-border bg-muted/40'>
                  <td
                    colSpan={checklist.occasions.length + 2}
                    className='sticky left-0 z-10 bg-muted/40 px-4 py-2'
                  >
                    <span className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
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
