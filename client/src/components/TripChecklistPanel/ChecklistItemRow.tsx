import { getEffectiveLocations } from '@tripdeck/shared';
import { Fragment } from 'react';

import StorageBadges from '@/components/Checklist/shared/StorageBadges';
import type { ChecklistItem, ChecklistOccasion } from '@/types';

import CheckCell from './CheckCell';
import ChecklistLocationRow from './ChecklistLocationRow';
import ChecklistSpecRow from './ChecklistSpecRow';
import { getItemCheckState } from './checkProgress';
import { getCheckCellLabel, type CheckGetter } from './checkUnits';

interface Props {
  item: ChecklistItem;
  index: number;
  occasions: ChecklistOccasion[];
  getCheck: CheckGetter;
  getSpecCheck: CheckGetter;
  onToggleCheck: (occId: number, itemId: number, location: string) => void;
  onToggleSpecCheck: (occId: number, specId: number, location: string) => void;
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
}: Props) {
  const specs = item.specs ?? [];
  const hasSpecs = specs.length > 0;
  const locations = getEffectiveLocations(item.storage_location);
  const hasLocationRows = !hasSpecs && locations.length > 1;
  const hasChildren = hasSpecs || hasLocationRows;
  const [singleLocation] = locations;

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
            {item.storage_location && (
              <div className='flex items-center gap-1.5'>
                <StorageBadges value={item.storage_location} />
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
        locations.map((location, locationIndex) => (
          <ChecklistLocationRow
            key={location}
            name={item.name}
            location={location}
            depth={1}
            isLast={locationIndex === locations.length - 1}
            itemIndex={index}
            occasions={occasions}
            isChecked={occId => getCheck(occId, item.id, location)}
            onToggle={occId => onToggleCheck(occId, item.id, location)}
          />
        ))}

      {specs.map((spec, specIndex) => (
        <ChecklistSpecRow
          key={spec.id}
          item={item}
          spec={spec}
          specIndex={specIndex}
          itemIndex={index}
          isLast={specIndex === specs.length - 1}
          occasions={occasions}
          getSpecCheck={getSpecCheck}
          onToggleSpecCheck={onToggleSpecCheck}
        />
      ))}
    </Fragment>
  );
}
