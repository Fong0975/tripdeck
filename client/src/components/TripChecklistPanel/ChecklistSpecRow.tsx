import StorageBadges from '@/components/Checklist/shared/StorageBadges';
import type { ChecklistOccasion, ItemSpec } from '@/types';

import CheckCell from './CheckCell';
import type { CheckGetter } from './checkProgress';

interface Props {
  spec: ItemSpec;
  /** Zero-based position of the spec within its item. */
  specIndex: number;
  /** Zero-based position of the parent item, used for row striping. */
  itemIndex: number;
  isLast: boolean;
  occasions: ChecklistOccasion[];
  getSpecCheck: CheckGetter;
  onToggleSpecCheck: (occId: number, specId: number) => void;
}

/** A spec of a checklist item, with its own check cell per occasion. */
export default function ChecklistSpecRow({
  spec,
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
          <StorageBadges value={spec.storage_location} compact />
        </div>
      </td>

      {occasions.map(occ => (
        <CheckCell
          key={occ.id}
          state={getSpecCheck(occ.id, spec.id) ? 'checked' : 'unchecked'}
          label={`${spec.name} - ${occ.name}`}
          onToggle={() => onToggleSpecCheck(occ.id, spec.id)}
        />
      ))}

      <td />
    </tr>
  );
}
