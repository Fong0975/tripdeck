import type { TripChecklist } from '@/types';

import {
  countCheckedUnits,
  countCheckUnits,
  type CheckGetter,
} from './checkProgress';

interface Props {
  checklist: TripChecklist;
  getCheck: CheckGetter;
  getSpecCheck: CheckGetter;
}

/** Table header with one progress column per occasion. */
export default function ChecklistTableHeader({
  checklist,
  getCheck,
  getSpecCheck,
}: Props) {
  const totalUnits = countCheckUnits(checklist.categories);

  return (
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
  );
}
