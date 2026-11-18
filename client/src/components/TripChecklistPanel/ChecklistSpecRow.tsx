import StorageBadges from '@/components/Checklist/shared/StorageBadges';
import type { ChecklistItem, ChecklistOccasion, ItemSpec } from '@/types';

import CheckCell from './CheckCell';
import ChecklistLocationRow from './ChecklistLocationRow';
import { getSpecCheckState } from './checkProgress';
import {
  getCheckCellLabel,
  getSpecLocations,
  type CheckGetter,
} from './checkUnits';

interface Props {
  item: ChecklistItem;
  spec: ItemSpec;
  /** Zero-based position of the spec within its item. */
  specIndex: number;
  /** Zero-based position of the parent item, used for row striping. */
  itemIndex: number;
  /** Whether this is the last spec of its item, closing the item's border. */
  isLast: boolean;
  occasions: ChecklistOccasion[];
  getSpecCheck: CheckGetter;
  onToggleSpecCheck: (occId: number, specId: number, location: string) => void;
}

/**
 * A spec of a checklist item. A spec with one location is a single row with
 * its own check cell per occasion. A spec filed under several locations is a
 * name row with a read-only state derived from them, followed by one row per
 * location that is checked independently.
 */
export default function ChecklistSpecRow({
  item,
  spec,
  specIndex,
  itemIndex,
  isLast,
  occasions,
  getSpecCheck,
  onToggleSpecCheck,
}: Props) {
  const locations = getSpecLocations(spec);
  const [singleLocation] = locations;
  const hasLocationRows = locations.length > 1;

  const nameRow = (
    <tr
      className={`group border-b transition-colors hover:bg-accent/60 ${
        isLast && !hasLocationRows ? 'border-border' : 'border-border/40'
      } ${itemIndex % 2 === 0 ? '' : 'bg-muted/10'}`}
    >
      <td className='sticky left-0 z-10 bg-background py-2 pr-2 pl-3 transition-colors group-hover:bg-accent sm:pr-4 sm:pl-8'>
        <div className='flex w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 border-l-4 border-primary/40 pl-3 wrap-break-word sm:w-64'>
          <span className='text-sm text-muted-foreground'>
            {specIndex + 1}.
          </span>
          <span className='text-sm text-foreground/80'>{spec.name}</span>
          {!hasLocationRows && spec.storage_location !== null && (
            <StorageBadges value={singleLocation} compact />
          )}
        </div>
      </td>

      {occasions.map(occ =>
        hasLocationRows ? (
          <CheckCell
            key={occ.id}
            state={getSpecCheckState(item, spec, occ.id, getSpecCheck)}
            label={`${spec.name} - ${occ.name}`}
          />
        ) : (
          <CheckCell
            key={occ.id}
            state={
              getSpecCheck(occ.id, spec.id, singleLocation)
                ? 'checked'
                : 'unchecked'
            }
            label={getCheckCellLabel(spec.name, singleLocation, occ.name)}
            onToggle={() => onToggleSpecCheck(occ.id, spec.id, singleLocation)}
          />
        ),
      )}

      <td />
    </tr>
  );

  if (!hasLocationRows) {
    return nameRow;
  }

  return (
    <>
      {nameRow}
      {locations.map((location, locationIndex) => (
        <ChecklistLocationRow
          key={location}
          name={spec.name}
          location={location}
          depth={2}
          isLast={isLast && locationIndex === locations.length - 1}
          itemIndex={itemIndex}
          occasions={occasions}
          isChecked={occId => getSpecCheck(occId, spec.id, location)}
          onToggle={occId => onToggleSpecCheck(occId, spec.id, location)}
        />
      ))}
    </>
  );
}
