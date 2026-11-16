import { Fragment } from 'react';

import StorageBadges from '@/components/Checklist/shared/StorageBadges';
import type { ChecklistItem, ChecklistOccasion } from '@/types';

import CheckCell from './CheckCell';
import ChecklistSpecRow from './ChecklistSpecRow';
import { getItemCheckState, type CheckGetter } from './checkProgress';

interface Props {
  item: ChecklistItem;
  index: number;
  occasions: ChecklistOccasion[];
  getCheck: CheckGetter;
  getSpecCheck: CheckGetter;
  onToggleCheck: (occId: number, itemId: number) => void;
  onToggleSpecCheck: (occId: number, specId: number) => void;
}

/**
 * An item row followed by one row per spec. An item without specs is checked
 * directly; an item with specs shows a read-only state derived from them.
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

  return (
    <Fragment>
      <tr
        className={`group border-b transition-colors hover:bg-accent/60 ${
          hasSpecs ? 'border-border/40' : 'border-border'
        } ${index % 2 === 0 ? '' : 'bg-muted/10'}`}
      >
        <td className='sticky left-0 z-10 bg-background px-4 py-3 transition-colors group-hover:bg-accent'>
          <div className='flex w-72 flex-col gap-1 wrap-break-word'>
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

        {occasions.map(occ => (
          <CheckCell
            key={occ.id}
            state={getItemCheckState(item, occ.id, getCheck, getSpecCheck)}
            label={`${item.name} - ${occ.name}`}
            onToggle={
              hasSpecs ? undefined : () => onToggleCheck(occ.id, item.id)
            }
          />
        ))}

        <td />
      </tr>

      {specs.map((spec, specIndex) => (
        <ChecklistSpecRow
          key={spec.id}
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
