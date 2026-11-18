import { NO_LOCATION } from '@tripdeck/shared';
import { Fragment } from 'react';

import { useLocationLabelSet } from '@/components/Checklist/locations/LocationLabelsContext';
import type { TripChecklist } from '@/types';

import CategorySubheaderRow from './CategorySubheaderRow';
import ChecklistStorageRow from './ChecklistStorageRow';
import type { CheckGetter } from './checkUnits';
import { groupByStorage, splitByCategory } from './groupByStorage';
import GroupHeaderRow from './GroupHeaderRow';

const NO_LOCATION_GROUP_LABEL = '未指定存放位置';

interface Props {
  checklist: TripChecklist;
  getCheck: CheckGetter;
  getSpecCheck: CheckGetter;
  onToggleCheck: (occId: number, itemId: number, location: string) => void;
  onToggleSpecCheck: (occId: number, specId: number, location: string) => void;
}

/** Table body that lists the checklist grouped by storage location. */
export default function ChecklistStorageBody({
  checklist,
  getCheck,
  getSpecCheck,
  onToggleCheck,
  onToggleSpecCheck,
}: Props) {
  const { labels } = useLocationLabelSet();

  return (
    <tbody>
      {groupByStorage(checklist.categories, labels).map(group => (
        <Fragment key={group.key}>
          <GroupHeaderRow
            label={
              group.key === NO_LOCATION ? NO_LOCATION_GROUP_LABEL : group.key
            }
            count={group.units.length}
            colSpan={checklist.occasions.length + 2}
          />
          {splitByCategory(group.units).map(section => (
            <Fragment key={section.categoryId}>
              <CategorySubheaderRow
                label={section.categoryName}
                colSpan={checklist.occasions.length + 2}
              />
              {section.units.map((unit, index) => (
                <ChecklistStorageRow
                  key={
                    unit.kind === 'item'
                      ? `item-${unit.item.id}`
                      : `spec-${unit.spec.id}`
                  }
                  unit={unit}
                  showLocation={
                    group.key === NO_LOCATION && unit.location !== NO_LOCATION
                  }
                  index={index}
                  occasions={checklist.occasions}
                  getCheck={getCheck}
                  getSpecCheck={getSpecCheck}
                  onToggleCheck={onToggleCheck}
                  onToggleSpecCheck={onToggleSpecCheck}
                />
              ))}
            </Fragment>
          ))}
        </Fragment>
      ))}
    </tbody>
  );
}
