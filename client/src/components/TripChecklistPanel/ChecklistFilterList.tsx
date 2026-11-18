import {
  groupState,
  isHidden,
  type FilterGroup,
  type HiddenKeys,
} from './checklistFilter';

interface Props {
  groups: FilterGroup[];
  hidden: HiddenKeys;
  onToggleItem: (groupKey: string, itemId: number) => void;
  onToggleGroup: (group: FilterGroup) => void;
}

/**
 * Checkbox list of the groups of the current view and their items. A group
 * checkbox shows and flips the visibility of all its items and is
 * indeterminate while only some are shown. Groups without items are skipped.
 */
export default function ChecklistFilterList({
  groups,
  hidden,
  onToggleItem,
  onToggleGroup,
}: Props) {
  const listedGroups = groups.filter(group => group.items.length > 0);

  if (listedGroups.length === 0) {
    return (
      <p className='px-2 py-1 text-sm text-muted-foreground'>
        沒有可篩選的項目
      </p>
    );
  }

  return (
    <div className='flex max-h-64 flex-col gap-2 overflow-y-auto'>
      {listedGroups.map(group => {
        const state = groupState(hidden, group);
        return (
          <div key={group.key} role='group' aria-label={group.label}>
            <label className='flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-accent'>
              <input
                type='checkbox'
                aria-label={`${group.label}（全部項目）`}
                checked={state === 'all'}
                ref={element => {
                  if (element) {
                    element.indeterminate = state === 'some';
                  }
                }}
                onChange={() => onToggleGroup(group)}
                className='size-4 accent-primary'
              />
              {group.label}
            </label>
            {group.items.map(item => (
              <label
                key={item.id}
                className='flex cursor-pointer items-center gap-2 rounded-md py-1 pr-2 pl-7 text-sm text-foreground hover:bg-accent'
              >
                <input
                  type='checkbox'
                  checked={!isHidden(hidden, group.key, item.id)}
                  onChange={() => onToggleItem(group.key, item.id)}
                  className='size-4 accent-primary'
                />
                {item.name}
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}
