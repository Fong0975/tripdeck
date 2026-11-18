import type { ChecklistOccasion } from '@/types';

import {
  getVisibleOccasions,
  type HiddenOccasionIds,
} from './occasionSelection';

interface Props {
  occasions: ChecklistOccasion[];
  hidden: HiddenOccasionIds;
  onToggle: (occasionId: number) => void;
}

/**
 * Checkboxes that choose which occasion columns are shown. The last shown
 * occasion cannot be unchecked. Nothing is rendered for fewer than two
 * occasions, as there is nothing to choose.
 */
export default function OccasionFilter({ occasions, hidden, onToggle }: Props) {
  if (occasions.length < 2) {
    return null;
  }
  const shownIds = new Set(
    getVisibleOccasions(occasions, hidden).map(occasion => occasion.id),
  );

  return (
    <div
      role='group'
      aria-label='檢查時機'
      className='flex flex-col gap-1 rounded-lg border border-border px-2.5 py-2'
    >
      <h4 className='text-xs font-medium text-muted-foreground'>檢查時機</h4>
      <div className='flex flex-wrap gap-x-3 gap-y-1'>
        {occasions.map(occasion => {
          const shown = shownIds.has(occasion.id);
          return (
            <label
              key={occasion.id}
              className='flex cursor-pointer items-center gap-1.5 text-sm text-foreground has-disabled:cursor-not-allowed'
            >
              <input
                type='checkbox'
                checked={shown}
                disabled={shown && shownIds.size === 1}
                onChange={() => onToggle(occasion.id)}
                className='size-4 accent-primary'
              />
              {occasion.name}
            </label>
          );
        })}
      </div>
    </div>
  );
}
