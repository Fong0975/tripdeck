import { useCallback, useMemo, useState } from 'react';

import { useLocationLabelSet } from '@/components/Checklist/locations/LocationLabelsContext';
import type { ChecklistCategory } from '@/types';

import {
  buildCategoryFilterGroups,
  buildStorageFilterGroups,
  hiddenCount,
  NO_HIDDEN_KEYS,
  toggleGroup,
  toggleItem,
  type FilterGroup,
  type HiddenKeys,
} from './checklistFilter';
import { groupByStorage } from './groupByStorage';
import type { ViewMode } from './viewMode';

/** State and actions of the checklist view settings. */
export interface ChecklistView {
  viewMode: ViewMode;
  /** Switches the view; the filter and "unfinished only" are reset. */
  changeViewMode: (mode: ViewMode) => void;
  /** Filter groups of the current view. */
  groups: FilterGroup[];
  /** Items hidden by the filter; kept while "unfinished only" is on. */
  hidden: HiddenKeys;
  /** Hidden items that currently apply: none while "unfinished only" is on. */
  activeHidden: HiddenKeys;
  /** True when the filter hides every item of the checklist. */
  allHidden: boolean;
  /** Whether only unfinished units are shown, overriding the item filter. */
  incompleteOnly: boolean;
  setIncompleteOnly: (enabled: boolean) => void;
  toggleItem: (groupKey: string, itemId: number) => void;
  toggleGroup: (group: FilterGroup) => void;
  clearFilter: () => void;
}

/**
 * Holds the view settings of the trip checklist: how it is grouped and which
 * items the filter hides. The settings live only as long as the component and
 * are never stored.
 *
 * @param categories - The checklist categories, or undefined while loading.
 */
export function useChecklistView(
  categories: ChecklistCategory[] | undefined,
): ChecklistView {
  const { labels } = useLocationLabelSet();
  const [viewMode, setViewMode] = useState<ViewMode>('category');
  const [hidden, setHidden] = useState<HiddenKeys>(NO_HIDDEN_KEYS);
  const [incompleteOnly, setIncompleteOnly] = useState(false);

  const groups = useMemo(() => {
    const source = categories ?? [];
    return viewMode === 'storage'
      ? buildStorageFilterGroups(groupByStorage(source, labels))
      : buildCategoryFilterGroups(source);
  }, [categories, labels, viewMode]);

  const itemTotal = groups.reduce((sum, group) => sum + group.items.length, 0);

  const changeViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setHidden(NO_HIDDEN_KEYS);
    setIncompleteOnly(false);
  }, []);

  return {
    viewMode,
    changeViewMode,
    groups,
    hidden,
    activeHidden: incompleteOnly ? NO_HIDDEN_KEYS : hidden,
    allHidden:
      !incompleteOnly &&
      itemTotal > 0 &&
      hiddenCount(hidden, groups) === itemTotal,
    incompleteOnly,
    setIncompleteOnly,
    toggleItem: (groupKey, itemId) =>
      setHidden(current => toggleItem(current, groupKey, itemId)),
    toggleGroup: group => setHidden(current => toggleGroup(current, group)),
    clearFilter: () => setHidden(NO_HIDDEN_KEYS),
  };
}
