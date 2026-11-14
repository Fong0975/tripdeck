import type { ChecklistOccasion } from '@/types';

import { nextTempId } from '../../shared/checklistUtils';
import type { EditOccasion } from '../../shared/types';
import { useTrackedEditState } from '../../shared/useTrackedEditState';

function initOccasions(occasions: ChecklistOccasion[]): EditOccasion[] {
  return occasions.map(o => ({ id: o.id, name: o.name }));
}

/**
 * Manages the local edit-state list for checklist occasions, independent
 * of categories/items/specs. Saving is handled separately by
 * useSaveChecklist. `isDirty` reports whether the list differs from the
 * initial occasions.
 */
export function useOccasionEditState(occasions: ChecklistOccasion[]) {
  const [items, setItems, isDirty] = useTrackedEditState(() =>
    initOccasions(occasions),
  );

  const addOccasionLocal = () => {
    setItems(prev => [...prev, { id: nextTempId(), name: '新時機' }]);
  };

  const updateOccasionName = (id: number, name: string) => {
    setItems(prev => prev.map(o => (o.id === id ? { ...o, name } : o)));
  };

  const removeOccasion = (id: number) => {
    if (id < 0) {
      setItems(prev => prev.filter(o => o.id !== id));
    } else {
      setItems(prev =>
        prev.map(o => (o.id === id ? { ...o, _deleted: true } : o)),
      );
    }
  };

  const visibleOccasions = items.filter(o => !o._deleted);

  return {
    occasions: items,
    visibleOccasions,
    isDirty,
    addOccasionLocal,
    updateOccasionName,
    removeOccasion,
  };
}
