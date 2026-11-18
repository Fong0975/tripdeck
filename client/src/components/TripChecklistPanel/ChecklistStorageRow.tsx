import type { ChecklistOccasion } from '@/types';

import CheckCell from './CheckCell';
import type { CheckGetter } from './checkUnits';
import type { StorageUnit } from './groupByStorage';

interface Props {
  unit: StorageUnit;
  /** Zero-based position within the group, used for row striping. */
  index: number;
  occasions: ChecklistOccasion[];
  getCheck: CheckGetter;
  getSpecCheck: CheckGetter;
  onToggleCheck: (occId: number, itemId: number, location: string) => void;
  onToggleSpecCheck: (occId: number, specId: number, location: string) => void;
}

/**
 * One checkable unit in the storage view: an item without specs, or a single
 * spec shown with its parent item name.
 */
export default function ChecklistStorageRow({
  unit,
  index,
  occasions,
  getCheck,
  getSpecCheck,
  onToggleCheck,
  onToggleSpecCheck,
}: Props) {
  const { item } = unit;

  return (
    <tr
      className={`group border-b border-border transition-colors hover:bg-accent/60 ${
        index % 2 === 0 ? '' : 'bg-muted/10'
      }`}
    >
      <td className='sticky left-0 z-10 bg-background px-2 py-3 transition-colors group-hover:bg-accent sm:px-4'>
        <div className='flex w-full flex-col gap-1 wrap-break-word sm:w-72'>
          <div className='flex items-baseline gap-2'>
            {unit.kind === 'item' ? (
              <>
                <span className='text-base font-medium text-foreground'>
                  {item.name}
                </span>
                <span className='text-sm text-muted-foreground'>
                  {item.quantity ? `× ${item.quantity}` : '些許'}
                </span>
              </>
            ) : (
              <>
                <span className='text-sm text-muted-foreground'>
                  {item.name} ›
                </span>
                <span className='text-base font-medium text-foreground'>
                  {unit.spec.name}
                </span>
              </>
            )}
          </div>
          {unit.kind === 'item' && item.notes && (
            <p className='text-sm text-muted-foreground'>{item.notes}</p>
          )}
        </div>
      </td>

      {occasions.map(occ => {
        const label = `${unit.kind === 'item' ? item.name : unit.spec.name} - ${occ.name}`;
        return unit.kind === 'item' ? (
          <CheckCell
            key={occ.id}
            state={
              getCheck(occ.id, item.id, unit.location) ? 'checked' : 'unchecked'
            }
            label={label}
            onToggle={() => onToggleCheck(occ.id, item.id, unit.location)}
          />
        ) : (
          <CheckCell
            key={occ.id}
            state={
              getSpecCheck(occ.id, unit.spec.id, unit.location)
                ? 'checked'
                : 'unchecked'
            }
            label={label}
            onToggle={() =>
              onToggleSpecCheck(occ.id, unit.spec.id, unit.location)
            }
          />
        );
      })}

      <td />
    </tr>
  );
}
