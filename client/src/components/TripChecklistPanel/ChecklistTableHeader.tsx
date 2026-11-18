import type { TripChecklist } from '@/types';

import { countCheckedUnits, countCheckUnits } from './checkProgress';
import type { CheckGetter } from './checkUnits';

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
        <th className='sticky left-0 z-20 w-full min-w-40 bg-background px-2 py-3 text-left font-semibold text-foreground sm:w-auto sm:min-w-80 sm:px-4'>
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
              className='min-w-20 p-2 text-center align-top sm:min-w-28 sm:px-4'
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
