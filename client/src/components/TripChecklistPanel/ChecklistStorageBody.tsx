import { Fragment } from 'react';

import type { TripChecklist } from '@/types';

import CategorySubheaderRow from './CategorySubheaderRow';
import ChecklistStorageRow from './ChecklistStorageRow';
import type { CheckGetter } from './checkUnits';
import {
  groupByStorage,
  splitByCategory,
  type StorageGroupKey,
} from './groupByStorage';
import GroupHeaderRow from './GroupHeaderRow';

const GROUP_LABELS: Record<StorageGroupKey, string> = {
  託運: '託運',
  隨身: '隨身',
  none: '未指定位置',
};

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
  return (
    <tbody>
      {groupByStorage(checklist.categories).map(group => (
        <Fragment key={group.key}>
          <GroupHeaderRow
            label={GROUP_LABELS[group.key]}
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
