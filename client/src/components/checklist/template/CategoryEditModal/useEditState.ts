import { useRef, useState } from 'react';

import type { ChecklistCategory } from '@/types';

import { nextTempId } from '../../shared/checklistUtils';
import type { EditCategory, EditItem, EditSpec } from '../../shared/types';

function categoryToEditState(cat: ChecklistCategory): EditCategory {
  return {
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
  };
}

/**
 * Manages the local edit-state tree for a single checklist template
 * category (name and items→specs), including CRUD handlers that operate
 * purely on local state. Saving is handled separately by
 * useSaveCategoryEdit.
 */
export function useEditState(category: ChecklistCategory) {
  const [edit, setEdit] = useState<EditCategory>(() =>
    categoryToEditState(category),
  );
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const updateCategoryName = (name: string) => {
    setEdit(prev => ({ ...prev, name }));
  };

  const updateItem = (itemId: number, fields: Partial<EditItem>) => {
    setEdit(prev => ({
      ...prev,
      items: prev.items.map(i => (i.id === itemId ? { ...i, ...fields } : i)),
    }));
  };

  const handleDeleteItem = (itemId: number) => {
    if (itemId < 0) {
      setEdit(prev => ({
        ...prev,
        items: prev.items.filter(i => i.id !== itemId),
      }));
    } else {
      setEdit(prev => ({
        ...prev,
        items: prev.items.map(i =>
          i.id === itemId ? { ...i, _deleted: true } : i,
        ),
      }));
    }
  };

  const addItem = () => {
    const newItem: EditItem = {
      id: nextTempId(),
      name: '新項目',
      quantity: null,
      notes: null,
      storage_location: null,
      specs: [],
    };
    setEdit(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setTimeout(() => {
      scrollBodyRef.current?.scrollTo({
        top: scrollBodyRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 0);
  };

  const updateSpec = (
    itemId: number,
    specId: number,
    fields: Partial<EditSpec>,
  ) => {
    setEdit(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.id === itemId
          ? {
              ...i,
              specs: i.specs.map(s =>
                s.id === specId ? { ...s, ...fields } : s,
              ),
            }
          : i,
      ),
    }));
  };

  const deleteSpec = (itemId: number, specId: number) => {
    setEdit(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.id === itemId
          ? { ...i, specs: i.specs.filter(s => s.id !== specId) }
          : i,
      ),
    }));
  };

  const addSpec = (itemId: number) => {
    const newSpec: EditSpec = {
      id: nextTempId(),
      name: '新規格',
      storage_location: null,
    };
    setEdit(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.id === itemId ? { ...i, specs: [...i.specs, newSpec] } : i,
      ),
    }));
  };

  const visibleItems = edit.items.filter(i => !i._deleted);

  return {
    edit,
    scrollBodyRef,
    visibleItems,
    updateCategoryName,
    updateItem,
    handleDeleteItem,
    addItem,
    updateSpec,
    deleteSpec,
    addSpec,
  };
}
