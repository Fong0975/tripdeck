import { SlidersHorizontal } from 'lucide-react';
import { useRef, useState } from 'react';

import AnchoredPopover from '@/components/ui/AnchoredPopover';

import {
  hiddenCount,
  type FilterGroup,
  type HiddenKeys,
} from './checklistFilter';
import ChecklistFilterList from './ChecklistFilterList';
import type { ViewMode } from './viewMode';
import ViewModeToggle from './ViewModeToggle';

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  /** Filter groups of the current view. */
  groups: FilterGroup[];
  hidden: HiddenKeys;
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
  onToggleItem,
  onToggleGroup,
  onClearFilter,
}: Props) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const hiddenTotal = hiddenCount(hidden, groups);

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
        {hiddenTotal > 0 && (
          <span className='rounded-full bg-primary px-1.5 text-xs text-primary-foreground'>
            已隱藏 {hiddenTotal}
          </span>
        )}
      </button>
      {open && (
        <AnchoredPopover
          anchorRef={anchorRef}
          label='檢視設定'
          onClose={() => setOpen(false)}
        >
          <div className='flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-3 p-1'>
            <section className='flex flex-col gap-1.5'>
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
