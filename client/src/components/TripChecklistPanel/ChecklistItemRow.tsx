import { getEffectiveLocations } from '@tripdeck/shared';
import { Fragment } from 'react';

import { useLocationLabelSet } from '@/components/Checklist/locations/LocationLabelsContext';
import { summarizeSpecLocations } from '@/components/Checklist/shared/checklistUtils';
import StorageBadges from '@/components/Checklist/shared/StorageBadges';
import type { ChecklistItem, ChecklistOccasion } from '@/types';

import CheckCell from './CheckCell';
import ChecklistLocationRow from './ChecklistLocationRow';
import ChecklistSpecRow from './ChecklistSpecRow';
import { getItemCheckState } from './checkProgress';
import {
  getCheckCellLabel,
  getItemUnits,
  type CheckGetter,
} from './checkUnits';
import type { UnitVisibility } from './incompleteFilter';

interface Props {
  item: ChecklistItem;
  index: number;
  occasions: ChecklistOccasion[];
  getCheck: CheckGetter;
  getSpecCheck: CheckGetter;
  onToggleCheck: (occId: number, itemId: number, location: string) => void;
  onToggleSpecCheck: (occId: number, specId: number, location: string) => void;
  /**
   * Limits the location and spec rows to the visible units. The state of the
   * item's own row still covers all of its units. Defaults to every unit.
   */
  isUnitVisible?: UnitVisibility;
}

/**
 * The rows of one item. An item without specs and with one location is a
 * single checkable row. An item filed under several locations, or with
 * specs, is a name row with a read-only state derived from its parts,
 * followed by one row per location, or per spec, that is checked
 * independently.
 */
export default function ChecklistItemRow({
  item,
  index,
  occasions,
  getCheck,
  getSpecCheck,
  onToggleCheck,
  onToggleSpecCheck,
  isUnitVisible,
}: Props) {
  const { names } = useLocationLabelSet();
  const specs = item.specs ?? [];
  const hasSpecs = specs.length > 0;
  const locations = getEffectiveLocations(item.storage_location);
  const hasLocationRows = !hasSpecs && locations.length > 1;
  const hasChildren = hasSpecs || hasLocationRows;
  const [singleLocation] = locations;
  const visibleUnits = getItemUnits(item).filter(
    unit => isUnitVisible?.(unit) ?? true,
  );
  const visibleLocations = visibleUnits.map(unit => unit.location);
  const visibleSpecs = specs.filter(spec =>
    visibleUnits.some(unit => unit.kind === 'spec' && unit.spec.id === spec.id),
  );
  const shownLocation = hasSpecs
    ? summarizeSpecLocations(specs, names)
    : item.storage_location;

  return (
    <Fragment>
      <tr
        className={`group border-b transition-colors hover:bg-accent/60 ${
          hasChildren ? 'border-border/40' : 'border-border'
        } ${index % 2 === 0 ? '' : 'bg-muted/10'}`}
      >
        <td className='sticky left-0 z-10 bg-background px-2 py-3 transition-colors group-hover:bg-accent sm:px-4'>
          <div className='flex w-full flex-col gap-1 wrap-break-word sm:w-72'>
            <div className='flex items-baseline gap-2'>
              <span className='text-base font-medium text-foreground'>
                {item.name}
              </span>
              <span className='text-sm text-muted-foreground'>
                {item.quantity ? `× ${item.quantity}` : '些許'}
              </span>
            </div>
            {item.notes && (
              <p className='text-sm text-muted-foreground'>{item.notes}</p>
            )}
            {shownLocation && (
              <div className='flex items-center gap-1.5'>
                <StorageBadges value={shownLocation} />
              </div>
            )}
          </div>
        </td>

        {occasions.map(occ =>
          hasChildren ? (
            <CheckCell
              key={occ.id}
              state={getItemCheckState(item, occ.id, getCheck, getSpecCheck)}
              label={`${item.name} - ${occ.name}`}
            />
          ) : (
            <CheckCell
              key={occ.id}
              state={
                getCheck(occ.id, item.id, singleLocation)
                  ? 'checked'
                  : 'unchecked'
              }
              label={getCheckCellLabel(item.name, singleLocation, occ.name)}
              onToggle={() => onToggleCheck(occ.id, item.id, singleLocation)}
            />
          ),
        )}

        <td />
      </tr>

      {hasLocationRows &&
        visibleLocations.map((location, locationIndex) => (
          <ChecklistLocationRow
            key={location}
            name={item.name}
            location={location}
            depth={1}
            isLast={locationIndex === visibleLocations.length - 1}
            itemIndex={index}
            occasions={occasions}
            isChecked={occId => getCheck(occId, item.id, location)}
            onToggle={occId => onToggleCheck(occId, item.id, location)}
          />
        ))}

      {visibleSpecs.map(spec => (
        <ChecklistSpecRow
          key={spec.id}
          item={item}
          spec={spec}
          specIndex={specs.indexOf(spec)}
          itemIndex={index}
          isLast={spec === visibleSpecs[visibleSpecs.length - 1]}
          isUnitVisible={isUnitVisible}
          occasions={occasions}
          getSpecCheck={getSpecCheck}
          onToggleSpecCheck={onToggleSpecCheck}
        />
      ))}
    </Fragment>
  );
}
