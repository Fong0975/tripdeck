import type { Ref } from 'react';

import type { TripChecklist } from '@/types';

import { countCheckedUnits, countCheckUnits } from './checkProgress';
import { isUnitChecked, type CheckGetter, type CheckUnit } from './checkUnits';

interface Props {
  checklist: TripChecklist;
  getCheck: CheckGetter;
  getSpecCheck: CheckGetter;
  /**
   * Units the table shows rows for. While fewer than all units are shown, the
   * progress of the shown units is listed below the overall progress.
   */
  displayedUnits?: CheckUnit[];
  /** Ref to the `thead`, used to offset the sticky section headers. */
  headRef?: Ref<HTMLTableSectionElement>;
}

/** Table header with one progress column per occasion. */
export default function ChecklistTableHeader({
  checklist,
  getCheck,
  getSpecCheck,
  displayedUnits,
  headRef,
}: Props) {
  const totalUnits = countCheckUnits(checklist.categories);
  const isFiltered =
    displayedUnits !== undefined && displayedUnits.length !== totalUnits;

  return (
    <thead ref={headRef}>
      <tr className='border-b border-border'>
        <th className='sticky top-0 left-0 z-30 w-full min-w-40 bg-background px-2 py-3 text-left font-semibold text-foreground sm:w-auto sm:min-w-80 sm:px-4'>
          項目
        </th>
        {checklist.occasions.map(occ => {
          const checked = countCheckedUnits(
            checklist.categories,
            occ.id,
            getCheck,
            getSpecCheck,
          );
          const shownTotal = displayedUnits?.length ?? 0;
          const shownChecked = (displayedUnits ?? []).filter(unit =>
            isUnitChecked(unit, occ.id, getCheck, getSpecCheck),
          ).length;
          const pct = totalUnits > 0 ? (checked / totalUnits) * 100 : 0;
          return (
            <th
              key={occ.id}
              className='sticky top-0 z-20 min-w-20 bg-background p-2 text-center align-top sm:min-w-28 sm:px-4'
            >
              <div className='flex flex-col items-center gap-1'>
                <span className='text-base font-semibold text-foreground'>
                  {occ.name}
                </span>
                <span className='text-sm text-muted-foreground'>
                  {checked} / {totalUnits}
                </span>
                {isFiltered && (
                  <span
                    title='篩選後的進度'
                    className='text-xs font-medium text-primary'
                  >
                    {shownChecked} / {shownTotal}
                  </span>
                )}
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
