import { useRef, useState } from 'react';

import type { TripChecklist } from '@/types';

import { nextTempId } from '../../shared/checklistUtils';
import type {
  EditCategory,
  EditItem,
  EditOccasion,
  EditSpec,
} from '../../shared/types';

type EditState = {
  occasions: EditOccasion[];
  categories: EditCategory[];
};

function initEditState(checklist: TripChecklist): EditState {
  return {
    occasions: checklist.occasions.map(o => ({ id: o.id, name: o.name })),
    categories: checklist.categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      items: cat.items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity ?? null,
        notes: item.notes ?? null,
        storage_location: item.storage_location ?? null,
        specs: (item.specs ?? []).map(spec => ({
          id: spec.id,
          name: spec.name,
          storage_location: spec.storage_location,
        })),
      })),
    })),
  };
}

/**
 * Manages the local edit-state tree for the trip checklist editor
 * (occasions and categories→items→specs), including CRUD handlers that
 * operate purely on local state. Saving is handled separately by
 * useSaveChecklist.
 */
export function useEditState(checklist: TripChecklist) {
  const [edit, setEdit] = useState<EditState>(() => initEditState(checklist));
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  // ---------- Occasion handlers ----------

  const addOccasionLocal = () => {
    setEdit(prev => ({
      ...prev,
      occasions: [...prev.occasions, { id: nextTempId(), name: '新時機' }],
    }));
  };

  const updateOccasionName = (id: number, name: string) => {
    setEdit(prev => ({
      ...prev,
      occasions: prev.occasions.map(o => (o.id === id ? { ...o, name } : o)),
    }));
  };

  const removeOccasion = (id: number) => {
    if (id < 0) {
      setEdit(prev => ({
        ...prev,
        occasions: prev.occasions.filter(o => o.id !== id),
      }));
    } else {
      setEdit(prev => ({
        ...prev,
        occasions: prev.occasions.map(o =>
          o.id === id ? { ...o, _deleted: true } : o,
        ),
      }));
    }
  };

  // ---------- Category handlers ----------

  const addCategoryLocal = () => {
    const newCat: EditCategory = {
      id: nextTempId(),
      name: '新分類',
      items: [],
    };
    setEdit(prev => ({ ...prev, categories: [...prev.categories, newCat] }));
    setTimeout(() => {
      scrollBodyRef.current?.scrollTo({
        top: scrollBodyRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 0);
  };

  const updateCategoryName = (catId: number, name: string) => {
    setEdit(prev => ({
      ...prev,
      categories: prev.categories.map(c =>
        c.id === catId ? { ...c, name } : c,
      ),
    }));
  };

  const removeCategory = (catId: number) => {
    if (catId < 0) {
      setEdit(prev => ({
        ...prev,
        categories: prev.categories.filter(c => c.id !== catId),
      }));
    } else {
      setEdit(prev => ({
        ...prev,
        categories: prev.categories.map(c =>
          c.id === catId ? { ...c, _deleted: true } : c,
        ),
      }));
    }
  };

  const toggleCatExpanded = (catId: number) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  // ---------- Item handlers ----------

  const addItemLocal = (catId: number) => {
    const newItem: EditItem = {
      id: nextTempId(),
      name: '新項目',
      quantity: null,
      notes: null,
      storage_location: null,
      specs: [],
    };
    setEdit(prev => ({
      ...prev,
      categories: prev.categories.map(c =>
        c.id === catId ? { ...c, items: [...c.items, newItem] } : c,
      ),
    }));
  };

  const updateItem = (
    catId: number,
    itemId: number,
    fields: Partial<EditItem>,
  ) => {
    setEdit(prev => ({
      ...prev,
      categories: prev.categories.map(c =>
        c.id === catId
          ? {
              ...c,
              items: c.items.map(i =>
                i.id === itemId ? { ...i, ...fields } : i,
              ),
            }
          : c,
      ),
    }));
  };

  const removeItem = (catId: number, itemId: number) => {
    if (itemId < 0) {
      setEdit(prev => ({
        ...prev,
        categories: prev.categories.map(c =>
          c.id === catId
            ? { ...c, items: c.items.filter(i => i.id !== itemId) }
            : c,
        ),
      }));
    } else {
      setEdit(prev => ({
        ...prev,
        categories: prev.categories.map(c =>
          c.id === catId
            ? {
                ...c,
                items: c.items.map(i =>
                  i.id === itemId ? { ...i, _deleted: true } : i,
                ),
              }
            : c,
        ),
      }));
    }
  };

  // ---------- Spec handlers ----------

  const addSpecLocal = (catId: number, itemId: number) => {
    const newSpec: EditSpec = {
      id: nextTempId(),
      name: '新規格',
      storage_location: null,
    };
    setEdit(prev => ({
      ...prev,
      categories: prev.categories.map(c =>
        c.id === catId
          ? {
              ...c,
              items: c.items.map(i =>
                i.id === itemId ? { ...i, specs: [...i.specs, newSpec] } : i,
              ),
            }
          : c,
      ),
    }));
  };

  const updateSpec = (
    catId: number,
    itemId: number,
    specId: number,
    fields: Partial<EditSpec>,
  ) => {
    setEdit(prev => ({
      ...prev,
      categories: prev.categories.map(c =>
        c.id === catId
          ? {
              ...c,
              items: c.items.map(i =>
                i.id === itemId
                  ? {
                      ...i,
                      specs: i.specs.map(s =>
                        s.id === specId ? { ...s, ...fields } : s,
                      ),
                    }
                  : i,
              ),
            }
          : c,
      ),
    }));
  };

  const removeSpec = (catId: number, itemId: number, specId: number) => {
    setEdit(prev => ({
      ...prev,
      categories: prev.categories.map(c =>
        c.id === catId
          ? {
              ...c,
              items: c.items.map(i =>
                i.id === itemId
                  ? { ...i, specs: i.specs.filter(s => s.id !== specId) }
                  : i,
              ),
            }
          : c,
      ),
    }));
  };

  const visibleOccasions = edit.occasions.filter(o => !o._deleted);
  const visibleCategories = edit.categories.filter(c => !c._deleted);

  return {
    edit,
    expandedCats,
    scrollBodyRef,
    visibleOccasions,
    visibleCategories,
    addOccasionLocal,
    updateOccasionName,
    removeOccasion,
    addCategoryLocal,
    updateCategoryName,
    removeCategory,
    toggleCatExpanded,
    addItemLocal,
    updateItem,
    removeItem,
    addSpecLocal,
    updateSpec,
    removeSpec,
  };
}
