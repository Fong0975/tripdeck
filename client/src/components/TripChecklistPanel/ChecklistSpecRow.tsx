import StorageBadges from '@/components/Checklist/shared/StorageBadges';
import type { ChecklistOccasion, ItemSpec } from '@/types';

import CheckCell from './CheckCell';
import { getCheckCellLabel, type CheckGetter } from './checkUnits';

interface Props {
  spec: ItemSpec;
  /** The location this row checks; `''` when the spec has none. */
  location: string;
  /** Whether to show the location badge next to the spec name. */
  showLocation: boolean;
  /** Zero-based position of the spec within its item. */
  specIndex: number;
  /** Zero-based position of the parent item, used for row striping. */
  itemIndex: number;
  isLast: boolean;
  occasions: ChecklistOccasion[];
  getSpecCheck: CheckGetter;
  onToggleSpecCheck: (occId: number, specId: number, location: string) => void;
}

/**
 * One row of a spec at one of its locations, with its own check cell per
 * occasion. A spec filed under several locations has one such row each.
 */
export default function ChecklistSpecRow({
  spec,
  location,
  showLocation,
  specIndex,
  itemIndex,
  isLast,
  occasions,
  getSpecCheck,
  onToggleSpecCheck,
}: Props) {
  return (
    <tr
      className={`group border-b transition-colors hover:bg-accent/60 ${
        isLast ? 'border-border' : 'border-border/40'
      } ${itemIndex % 2 === 0 ? '' : 'bg-muted/10'}`}
    >
      <td className='sticky left-0 z-10 bg-background py-2 pr-2 pl-3 transition-colors group-hover:bg-accent sm:pr-4 sm:pl-8'>
        <div className='flex w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 border-l-4 border-primary/40 pl-3 wrap-break-word sm:w-64'>
          <span className='text-sm text-muted-foreground'>
            {specIndex + 1}.
          </span>
          <span className='text-sm text-foreground/80'>{spec.name}</span>
          {showLocation && <StorageBadges value={location} compact />}
        </div>
      </td>

      {occasions.map(occ => (
        <CheckCell
          key={occ.id}
          state={
            getSpecCheck(occ.id, spec.id, location) ? 'checked' : 'unchecked'
          }
          label={getCheckCellLabel(spec.name, location, occ.name)}
          onToggle={() => onToggleSpecCheck(occ.id, spec.id, location)}
        />
      ))}

      <td />
    </tr>
  );
}
