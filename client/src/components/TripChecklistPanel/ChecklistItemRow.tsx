import { getEffectiveLocations } from '@tripdeck/shared';
import { Fragment } from 'react';

import StorageBadges from '@/components/Checklist/shared/StorageBadges';
import type { ChecklistItem, ChecklistOccasion } from '@/types';

import CheckCell from './CheckCell';
import ChecklistSpecRow from './ChecklistSpecRow';
import { getItemCheckState } from './checkProgress';
import {
  getCheckCellLabel,
  getSpecLocations,
  type CheckGetter,
} from './checkUnits';

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
 * The rows of one item. An item without specs has one independently checked
 * row per storage location. An item with specs shows a read-only row whose
 * state is derived from its specs, followed by one row per spec and location.
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
  const rowClass = (borderClass: string) =>
    `group border-b transition-colors hover:bg-accent/60 ${borderClass} ${
      index % 2 === 0 ? '' : 'bg-muted/10'
    }`;

  const renderNameCell = (location: string | null) => (
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
        {(location ?? item.storage_location) && (
          <div className='flex items-center gap-1.5'>
            <StorageBadges value={location ?? item.storage_location} />
          </div>
        )}
      </div>
    </td>
  );

  if (!hasSpecs) {
    return (
      <Fragment>
        {getEffectiveLocations(item.storage_location).map(location => (
          <tr key={location} className={rowClass('border-border')}>
            {renderNameCell(location)}
            {occasions.map(occ => (
              <CheckCell
                key={occ.id}
                state={
                  getCheck(occ.id, item.id, location) ? 'checked' : 'unchecked'
                }
                label={getCheckCellLabel(item.name, location, occ.name)}
                onToggle={() => onToggleCheck(occ.id, item.id, location)}
              />
            ))}
            <td />
          </tr>
        ))}
      </Fragment>
    );
  }

  const specRows = specs.flatMap((spec, specIndex) => {
    const locations = getSpecLocations(item, spec);
    return locations.map(location => ({
      spec,
      specIndex,
      location,
      showLocation: spec.storage_location !== null || locations.length > 1,
    }));
  });

  return (
    <Fragment>
      <tr className={rowClass('border-border/40')}>
        {renderNameCell(null)}
        {occasions.map(occ => (
          <CheckCell
            key={occ.id}
            state={getItemCheckState(item, occ.id, getCheck, getSpecCheck)}
            label={`${item.name} - ${occ.name}`}
          />
        ))}
        <td />
      </tr>

      {specRows.map((row, rowIndex) => (
        <ChecklistSpecRow
          key={`${row.spec.id}|${row.location}`}
          spec={row.spec}
          location={row.location}
          showLocation={row.showLocation}
          specIndex={row.specIndex}
          itemIndex={index}
          isLast={rowIndex === specRows.length - 1}
          occasions={occasions}
          getSpecCheck={getSpecCheck}
          onToggleSpecCheck={onToggleSpecCheck}
        />
      ))}
    </Fragment>
  );
}
