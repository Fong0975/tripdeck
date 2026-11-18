import { useCallback, useMemo, useState } from 'react';

import { useLocationLabelSet } from '@/components/Checklist/locations/LocationLabelsContext';
import type { ChecklistCategory, ChecklistOccasion } from '@/types';

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
import type { CheckUnit } from './checkUnits';
import { groupByStorage } from './groupByStorage';
import {
  getVisibleOccasions,
  NO_HIDDEN_OCCASIONS,
  toggleOccasion,
  type HiddenOccasionIds,
} from './occasionSelection';
import type { ViewMode } from './viewMode';
import { getDisplayedUnits } from './visibleRows';

const NO_OCCASIONS: ChecklistOccasion[] = [];

/** State and actions of the checklist view settings. */
export interface ChecklistView {
  viewMode: ViewMode;
  /** Switches the view; the filter and "unfinished only" are reset. */
  changeViewMode: (mode: ViewMode) => void;
  /** Filter groups of the current view. */
  groups: FilterGroup[];
  /** Items hidden by the filter. */
  hidden: HiddenKeys;
  /** Units the item filter leaves in the current view. */
  filteredUnits: CheckUnit[];
  /** True when the filter hides every item of the checklist. */
  allHidden: boolean;
  /** Whether finished units are hidden, on top of the item filter. */
  incompleteOnly: boolean;
  setIncompleteOnly: (enabled: boolean) => void;
  /** All occasions of the checklist. */
  occasions: ChecklistOccasion[];
  /** Ids of the occasions whose columns are hidden. */
  hiddenOccasionIds: HiddenOccasionIds;
  /** The occasions whose columns are shown; never empty for a checklist. */
  visibleOccasions: ChecklistOccasion[];
  /** Shows or hides an occasion column; the last shown one stays. */
  toggleOccasion: (occasionId: number) => void;
  toggleItem: (groupKey: string, itemId: number) => void;
  toggleGroup: (group: FilterGroup) => void;
  clearFilter: () => void;
}

/**
 * Holds the view settings of the trip checklist: how it is grouped and which
 * items the filter hides. The settings live only as long as the component and
 * are never stored.
 *
 * The occasion selection is the exception: it survives a change of the view
 * mode, as it does not depend on how rows are grouped.
 *
 * @param categories - The checklist categories, or undefined while loading.
 * @param occasions - The checklist occasions, or undefined while loading.
 */
export function useChecklistView(
  categories: ChecklistCategory[] | undefined,
  occasions: ChecklistOccasion[] | undefined,
): ChecklistView {
  const { labels } = useLocationLabelSet();
  const [viewMode, setViewMode] = useState<ViewMode>('category');
  const [hidden, setHidden] = useState<HiddenKeys>(NO_HIDDEN_KEYS);
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [hiddenOccasionIds, setHiddenOccasionIds] =
    useState<HiddenOccasionIds>(NO_HIDDEN_OCCASIONS);
  const allOccasions = occasions ?? NO_OCCASIONS;
  const visibleOccasions = useMemo(
    () => getVisibleOccasions(allOccasions, hiddenOccasionIds),
    [allOccasions, hiddenOccasionIds],
  );

  const groups = useMemo(() => {
    const source = categories ?? [];
    return viewMode === 'storage'
      ? buildStorageFilterGroups(groupByStorage(source, labels))
      : buildCategoryFilterGroups(source);
  }, [categories, labels, viewMode]);

  const filteredUnits = useMemo(
    () => getDisplayedUnits(viewMode, categories ?? [], labels, hidden),
    [viewMode, categories, labels, hidden],
  );

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
    filteredUnits,
    allHidden: itemTotal > 0 && hiddenCount(hidden, groups) === itemTotal,
    incompleteOnly,
    setIncompleteOnly,
    occasions: allOccasions,
    hiddenOccasionIds,
    visibleOccasions,
    toggleOccasion: occasionId =>
      setHiddenOccasionIds(current =>
        toggleOccasion(allOccasions, current, occasionId),
      ),
    toggleItem: (groupKey, itemId) =>
      setHidden(current => toggleItem(current, groupKey, itemId)),
    toggleGroup: group => setHidden(current => toggleGroup(current, group)),
    clearFilter: () => setHidden(NO_HIDDEN_KEYS),
  };
}
