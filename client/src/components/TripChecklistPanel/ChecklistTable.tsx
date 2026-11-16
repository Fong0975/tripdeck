import { Fragment } from 'react';

import type { TripChecklist } from '@/types';

import ChecklistItemRow from './ChecklistItemRow';
import {
  countCheckedUnits,
  countCheckUnits,
  type CheckGetter,
} from './checkProgress';

interface Props {
  checklist: TripChecklist;
  getCheck: CheckGetter;
  getSpecCheck: CheckGetter;
  onToggleCheck: (occId: number, itemId: number) => void;
  onToggleSpecCheck: (occId: number, specId: number) => void;
}

export default function ChecklistTable({
  checklist,
  getCheck,
  getSpecCheck,
  onToggleCheck,
  onToggleSpecCheck,
}: Props) {
  const totalUnits = countCheckUnits(checklist.categories);

  return (
    <div className='flex-1 overflow-auto'>
      <div className='mx-auto w-fit'>
        <table className='border-collapse text-base'>
          <thead>
            <tr className='border-b border-border'>
              <th className='sticky left-0 z-20 min-w-80 bg-background px-4 py-3 text-left font-semibold text-foreground'>
                項目
              </th>
              {checklist.occasions.map(occ => {
                const checked = countCheckedUnits(
                  checklist.categories,
                  occ.id,
                  getCheck,
                  getSpecCheck,
                );
                const pct = totalUnits > 0 ? (checked / totalUnits) * 100 : 0;
                return (
                  <th
                    key={occ.id}
                    className='min-w-28 px-4 py-2 text-center align-top'
                  >
                    <div className='flex flex-col items-center gap-1'>
                      <span className='text-base font-semibold text-foreground'>
                        {occ.name}
                      </span>
                      <span className='text-sm text-muted-foreground'>
                        {checked} / {totalUnits}
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
                <tr className='border-b border-border bg-primary/10'>
                  <td
                    colSpan={checklist.occasions.length + 2}
                    className='sticky left-0 z-10 border-l-4 border-primary bg-primary/10 px-4 py-2.5'
                  >
                    <div className='flex items-baseline gap-2'>
                      <span className='text-base font-semibold text-foreground'>
                        {cat.name}
                      </span>
                      <span className='text-sm text-muted-foreground'>
                        {cat.items.length} 項
                      </span>
                    </div>
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
                    getSpecCheck={getSpecCheck}
                    onToggleCheck={onToggleCheck}
                    onToggleSpecCheck={onToggleSpecCheck}
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
