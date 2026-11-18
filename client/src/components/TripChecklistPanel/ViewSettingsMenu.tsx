import { SlidersHorizontal } from 'lucide-react';
import { useRef, useState } from 'react';

import AnchoredPopover from '@/components/ui/AnchoredPopover';
import type { ChecklistOccasion } from '@/types';

import {
  hiddenCount,
  type FilterGroup,
  type HiddenKeys,
} from './checklistFilter';
import ChecklistFilterList from './ChecklistFilterList';
import OccasionFilter from './OccasionFilter';
import {
  getVisibleOccasions,
  type HiddenOccasionIds,
} from './occasionSelection';
import type { ViewMode } from './viewMode';
import ViewModeToggle from './ViewModeToggle';

const INCOMPLETE_HINT_ID = 'view-settings-incomplete-hint';

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  /** Filter groups of the current view. */
  groups: FilterGroup[];
  hidden: HiddenKeys;
  /** Whether finished units are hidden, on top of the item filter. */
  incompleteOnly: boolean;
  onIncompleteOnlyChange: (enabled: boolean) => void;
  /** All occasions of the checklist. */
  occasions: ChecklistOccasion[];
  hiddenOccasionIds: HiddenOccasionIds;
  onToggleOccasion: (occasionId: number) => void;
  onToggleItem: (groupKey: string, itemId: number) => void;
  onToggleGroup: (group: FilterGroup) => void;
  onClearFilter: () => void;
}

/**
 * Button that opens the view settings of the checklist: how it is grouped and
 * which items are shown. The settings are not stored anywhere; the button
 * shows how many items are currently hidden.
 */
export default function ViewSettingsMenu({
  viewMode,
  onViewModeChange,
  groups,
  hidden,
  incompleteOnly,
  onIncompleteOnlyChange,
  occasions,
  hiddenOccasionIds,
  onToggleOccasion,
  onToggleItem,
  onToggleGroup,
  onClearFilter,
}: Props) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const hiddenTotal = hiddenCount(hidden, groups);
  const shownOccasionCount = getVisibleOccasions(
    occasions,
    hiddenOccasionIds,
  ).length;
  const hiddenOccasionCount = occasions.length - shownOccasionCount;
  const badges = [
    incompleteOnly ? '僅未完成' : null,
    hiddenTotal > 0 ? `已隱藏 ${hiddenTotal}` : null,
    hiddenOccasionCount > 0
      ? `時機 ${shownOccasionCount}/${occasions.length}`
      : null,
  ].filter((badge): badge is string => badge !== null);

  return (
    <>
      <button
        ref={anchorRef}
        type='button'
        aria-haspopup='true'
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className='flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent'
      >
        <SlidersHorizontal size={14} />
        檢視設定
        {badges.map(badge => (
          <span
            key={badge}
            className='rounded-full bg-primary px-1.5 text-xs text-primary-foreground'
          >
            {badge}
          </span>
        ))}
      </button>
      {open && (
        <AnchoredPopover
          anchorRef={anchorRef}
          label='檢視設定'
          onClose={() => setOpen(false)}
        >
          <div className='flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-3 p-1'>
            <section className='flex flex-col items-start gap-1.5'>
              <h3 className='text-xs font-medium text-muted-foreground'>
                檢視方式
              </h3>
              <ViewModeToggle value={viewMode} onChange={onViewModeChange} />
            </section>
            <section className='flex flex-col gap-1.5'>
              <div className='flex items-center justify-between'>
                <h3 className='text-xs font-medium text-muted-foreground'>
                  篩選項目
                </h3>
                <button
                  type='button'
                  disabled={hiddenTotal === 0}
                  onClick={onClearFilter}
                  className='text-xs text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline'
                >
                  清除篩選
                </button>
              </div>
              <label className='flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-sm text-foreground'>
                <input
                  type='checkbox'
                  checked={incompleteOnly}
                  aria-label='僅顯示未完成的項目'
                  aria-describedby={INCOMPLETE_HINT_ID}
                  onChange={event =>
                    onIncompleteOnlyChange(event.target.checked)
                  }
                  className='mt-0.5 size-4 accent-primary'
                />
                <span className='flex flex-col'>
                  <span className='font-medium'>僅顯示未完成的項目</span>
                  <span
                    id={INCOMPLETE_HINT_ID}
                    className='text-xs text-muted-foreground'
                  >
                    勾選後 3 秒隱藏；可與下方篩選併用
                  </span>
                </span>
              </label>
              <OccasionFilter
                occasions={occasions}
                hidden={hiddenOccasionIds}
                onToggle={onToggleOccasion}
              />
              <hr className='border-border' />
              <ChecklistFilterList
                groups={groups}
                hidden={hidden}
                onToggleItem={onToggleItem}
                onToggleGroup={onToggleGroup}
              />
            </section>
          </div>
        </AnchoredPopover>
      )}
    </>
  );
}
