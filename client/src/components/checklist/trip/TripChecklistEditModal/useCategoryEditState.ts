import { useRef, useState } from 'react';

import type { ChecklistCategory } from '@/types';

import { nextTempId } from '../../shared/checklistUtils';
import type { EditCategory, EditItem, EditSpec } from '../../shared/types';

function initCategories(categories: ChecklistCategory[]): EditCategory[] {
  return categories.map(cat => ({
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
  }));
}

/**
 * Manages the local edit-state tree for checklist categories→items→specs,
 * including CRUD handlers that operate purely on local state. Saving is
 * handled separately by useSaveChecklist.
 */
export function useCategoryEditState(categories: ChecklistCategory[]) {
  const [items, setItems] = useState<EditCategory[]>(() =>
    initCategories(categories),
  );
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  // ---------- Category handlers ----------

  const addCategoryLocal = () => {
    const newCat: EditCategory = {
      id: nextTempId(),
      name: '新分類',
      items: [],
    };
    setItems(prev => [...prev, newCat]);
    setTimeout(() => {
      scrollBodyRef.current?.scrollTo({
        top: scrollBodyRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 0);
  };

  const updateCategoryName = (catId: number, name: string) => {
    setItems(prev => prev.map(c => (c.id === catId ? { ...c, name } : c)));
  };

  const removeCategory = (catId: number) => {
    if (catId < 0) {
      setItems(prev => prev.filter(c => c.id !== catId));
    } else {
      setItems(prev =>
        prev.map(c => (c.id === catId ? { ...c, _deleted: true } : c)),
      );
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
    setItems(prev =>
      prev.map(c =>
        c.id === catId ? { ...c, items: [...c.items, newItem] } : c,
      ),
    );
  };

  const updateItem = (
    catId: number,
    itemId: number,
    fields: Partial<EditItem>,
  ) => {
    setItems(prev =>
      prev.map(c =>
        c.id === catId
          ? {
              ...c,
              items: c.items.map(i =>
                i.id === itemId ? { ...i, ...fields } : i,
              ),
            }
          : c,
      ),
    );
  };

  const removeItem = (catId: number, itemId: number) => {
    if (itemId < 0) {
      setItems(prev =>
        prev.map(c =>
          c.id === catId
            ? { ...c, items: c.items.filter(i => i.id !== itemId) }
            : c,
        ),
      );
    } else {
      setItems(prev =>
        prev.map(c =>
          c.id === catId
            ? {
                ...c,
                items: c.items.map(i =>
                  i.id === itemId ? { ...i, _deleted: true } : i,
                ),
              }
            : c,
        ),
      );
    }
  };

  // ---------- Spec handlers ----------

  const addSpecLocal = (catId: number, itemId: number) => {
    const newSpec: EditSpec = {
      id: nextTempId(),
      name: '新規格',
      storage_location: null,
    };
    setItems(prev =>
      prev.map(c =>
        c.id === catId
          ? {
              ...c,
              items: c.items.map(i =>
                i.id === itemId ? { ...i, specs: [...i.specs, newSpec] } : i,
              ),
            }
          : c,
      ),
    );
  };

  const updateSpec = (
    catId: number,
    itemId: number,
    specId: number,
    fields: Partial<EditSpec>,
  ) => {
    setItems(prev =>
      prev.map(c =>
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
    );
  };

  const removeSpec = (catId: number, itemId: number, specId: number) => {
    setItems(prev =>
      prev.map(c =>
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
    );
  };

  const visibleCategories = items.filter(c => !c._deleted);

  return {
    categories: items,
    expandedCats,
    scrollBodyRef,
    visibleCategories,
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
