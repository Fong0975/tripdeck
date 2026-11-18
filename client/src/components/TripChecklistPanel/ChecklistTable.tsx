import { type CSSProperties, Fragment, useRef } from 'react';

import { useLocationLabelSet } from '@/components/Checklist/locations/LocationLabelsContext';
import { useElementHeight } from '@/hooks/useElementHeight';
import type { TripChecklist } from '@/types';

import { NO_HIDDEN_KEYS, type HiddenKeys } from './checklistFilter';
import ChecklistItemRow from './ChecklistItemRow';
import ChecklistStorageBody from './ChecklistStorageBody';
import ChecklistTableHeader from './ChecklistTableHeader';
import type { CheckGetter } from './checkUnits';
import GroupHeaderRow from './GroupHeaderRow';
import type { UnitVisibility } from './incompleteFilter';
import type { ViewMode } from './viewMode';
import { getDisplayedUnits, getVisibleCategories } from './visibleRows';

interface Props {
  checklist: TripChecklist;
  getCheck: CheckGetter;
  getSpecCheck: CheckGetter;
  onToggleCheck: (occId: number, itemId: number, location: string) => void;
  onToggleSpecCheck: (occId: number, specId: number, location: string) => void;
  /** How rows are grouped; defaults to by category. */
  viewMode?: ViewMode;
  /**
   * Items the filter hides from the rows. The header shows the progress of
   * the whole checklist, and, while the item filter hides rows, of the rows
   * it leaves, counting finished rows the unfinished-only view hides too.
   */
  hidden?: HiddenKeys;
  /**
   * Limits the rows to the visible units (the "unfinished only" view).
   * Defaults to every unit.
   */
  isUnitVisible?: UnitVisibility;
}

export default function ChecklistTable({
  checklist,
  getCheck,
  getSpecCheck,
  onToggleCheck,
  onToggleSpecCheck,
  viewMode = 'category',
  hidden = NO_HIDDEN_KEYS,
  isUnitVisible,
}: Props) {
  const headRef = useRef<HTMLTableSectionElement>(null);
  const headHeight = useElementHeight(headRef);
  const { labels } = useLocationLabelSet();
  const visibleCategories = getVisibleCategories(
    checklist.categories,
    hidden,
    isUnitVisible,
  );
  const filteredUnits = getDisplayedUnits(
    viewMode,
    checklist.categories,
    labels,
    hidden,
  );

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
            displayedUnits={filteredUnits}
            headRef={headRef}
          />

          {viewMode === 'storage' ? (
            <ChecklistStorageBody
              checklist={checklist}
              hidden={hidden}
              isUnitVisible={isUnitVisible}
              getCheck={getCheck}
              getSpecCheck={getSpecCheck}
              onToggleCheck={onToggleCheck}
              onToggleSpecCheck={onToggleSpecCheck}
            />
          ) : (
            <tbody>
              {visibleCategories.map(cat => (
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
                      isUnitVisible={isUnitVisible}
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
