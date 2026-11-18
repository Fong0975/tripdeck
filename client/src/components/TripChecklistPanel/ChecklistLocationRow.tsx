import StorageBadges from '@/components/Checklist/shared/StorageBadges';
import type { ChecklistOccasion } from '@/types';

import CheckCell from './CheckCell';
import { getCheckCellLabel } from './checkUnits';

interface Props {
  /** Name of the item or spec this location belongs to, for cell labels. */
  name: string;
  /** The location this row checks. */
  location: string;
  /** 1 for a location under an item, 2 for a location under a spec. */
  depth: 1 | 2;
  /** Whether this is the last row of the whole item, closing its border. */
  isLast: boolean;
  /** Zero-based position of the parent item, used for row striping. */
  itemIndex: number;
  occasions: ChecklistOccasion[];
  isChecked: (occId: number) => boolean;
  onToggle: (occId: number) => void;
}

const INDENT: Record<Props['depth'], string> = {
  1: 'pl-3 sm:pl-8',
  2: 'pl-6 sm:pl-14',
};

/**
 * A row for one storage location of an item or spec that is filed under
 * several locations. It sits below the name row and carries the location's
 * own check cell per occasion.
 */
export default function ChecklistLocationRow({
  name,
  location,
  depth,
  isLast,
  itemIndex,
  occasions,
  isChecked,
  onToggle,
}: Props) {
  return (
    <tr
      className={`group border-b transition-colors hover:bg-accent/60 ${
        isLast ? 'border-border' : 'border-border/40'
      } ${itemIndex % 2 === 0 ? '' : 'bg-muted/10'}`}
    >
      <td
        className={`sticky left-0 z-10 bg-background py-2 pr-2 transition-colors group-hover:bg-accent sm:pr-4 ${INDENT[depth]}`}
      >
        <div
          className={`flex w-full flex-wrap items-center gap-1.5 border-l-4 pl-3 wrap-break-word sm:w-64 ${
            depth === 1 ? 'border-primary/40' : 'border-primary/20'
          }`}
        >
          <StorageBadges value={location} compact />
        </div>
      </td>

      {occasions.map(occ => (
        <CheckCell
          key={occ.id}
          state={isChecked(occ.id) ? 'checked' : 'unchecked'}
          label={getCheckCellLabel(name, location, occ.name)}
          onToggle={() => onToggle(occ.id)}
        />
      ))}

      <td />
    </tr>
  );
}
