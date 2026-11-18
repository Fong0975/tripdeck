import { type CSSProperties, Fragment, useRef } from 'react';

import { useElementHeight } from '@/hooks/useElementHeight';
import type { TripChecklist } from '@/types';

import {
  filterCategories,
  NO_HIDDEN_KEYS,
  type HiddenKeys,
} from './checklistFilter';
import ChecklistItemRow from './ChecklistItemRow';
import ChecklistStorageBody from './ChecklistStorageBody';
import ChecklistTableHeader from './ChecklistTableHeader';
import type { CheckGetter } from './checkUnits';
import GroupHeaderRow from './GroupHeaderRow';
import type { ViewMode } from './viewMode';

interface Props {
  checklist: TripChecklist;
  getCheck: CheckGetter;
  getSpecCheck: CheckGetter;
  onToggleCheck: (occId: number, itemId: number, location: string) => void;
  onToggleSpecCheck: (occId: number, specId: number, location: string) => void;
  /** How rows are grouped; defaults to by category. */
  viewMode?: ViewMode;
  /**
   * Items the filter hides from the rows. The header progress always counts
   * the whole checklist.
   */
  hidden?: HiddenKeys;
}

export default function ChecklistTable({
  checklist,
  getCheck,
  getSpecCheck,
  onToggleCheck,
  onToggleSpecCheck,
  viewMode = 'category',
  hidden = NO_HIDDEN_KEYS,
}: Props) {
  const headRef = useRef<HTMLTableSectionElement>(null);
  const headHeight = useElementHeight(headRef);

  return (
    <div
      className='flex-1 overflow-auto'
      style={{ '--checklist-head-h': `${headHeight}px` } as CSSProperties}
    >
      <div className='mx-auto w-full sm:w-fit'>
        <table className='w-full border-collapse text-base sm:w-auto'>
          <ChecklistTableHeader
            checklist={checklist}
            getCheck={getCheck}
            getSpecCheck={getSpecCheck}
            headRef={headRef}
          />

          {viewMode === 'storage' ? (
            <ChecklistStorageBody
              checklist={checklist}
              hidden={hidden}
              getCheck={getCheck}
              getSpecCheck={getSpecCheck}
              onToggleCheck={onToggleCheck}
              onToggleSpecCheck={onToggleSpecCheck}
            />
          ) : (
            <tbody>
              {filterCategories(checklist.categories, hidden).map(cat => (
                <Fragment key={cat.id}>
                  <GroupHeaderRow
                    label={cat.name}
                    count={cat.items.length}
                    colSpan={checklist.occasions.length + 2}
                  />
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
          )}
        </table>
      </div>
    </div>
  );
}
