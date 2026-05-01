import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';

import { nextTempId } from '@/components/checklist/checklistUtils';
import StorageCheckboxes from '@/components/checklist/StorageCheckboxes';
import type { TripChecklist } from '@/types';
import {
  addOccasion,
  addTripCategory,
  addTripItem,
  addTripItemSpec,
  deleteOccasion,
  deleteTripCategory,
  deleteTripItem,
  deleteTripItemSpec,
  updateOccasion,
  updateTripCategory,
  updateTripItem,
  updateTripItemSpec,
} from '@/utils/storage';

import type { EditCategory, EditItem, EditOccasion, EditSpec } from './types';

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

interface Props {
  tripId: number;
  checklist: TripChecklist;
  onClose: () => void;
  onSaved: () => void;
}

export default function TripChecklistEditModal({
  tripId,
  checklist,
  onClose,
  onSaved,
}: Props) {
  const [edit, setEdit] = useState<EditState>(() => initEditState(checklist));
  const [saving, setSaving] = useState(false);
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

  // ---------- Save ----------

  const handleSave = async () => {
    setSaving(true);
    try {
      // ── Occasions ──
      const origOccs = checklist.occasions;
      const keptOccIds = new Set(
        edit.occasions.filter(o => !o._deleted && o.id > 0).map(o => o.id),
      );
      for (const orig of origOccs) {
        if (!keptOccIds.has(orig.id)) {
          await deleteOccasion(tripId, orig.id);
        }
      }
      for (const o of edit.occasions.filter(o => !o._deleted && o.id > 0)) {
        const orig = origOccs.find(x => x.id === o.id);
        if (orig && o.name.trim() !== orig.name) {
          await updateOccasion(tripId, o.id, o.name.trim() || orig.name);
        }
      }
      for (const o of edit.occasions.filter(o => !o._deleted && o.id < 0)) {
        await addOccasion(tripId, o.name.trim() || '新時機');
      }

      // ── Categories ──
      const origCats = checklist.categories;
      const keptCatIds = new Set(
        edit.categories.filter(c => !c._deleted && c.id > 0).map(c => c.id),
      );
      for (const orig of origCats) {
        if (!keptCatIds.has(orig.id)) {
          await deleteTripCategory(tripId, orig.id);
        }
      }

      for (const editCat of edit.categories.filter(
        c => !c._deleted && c.id > 0,
      )) {
        const origCat = origCats.find(c => c.id === editCat.id);
        if (!origCat) {
          continue;
        }

        if (editCat.name.trim() !== origCat.name) {
          await updateTripCategory(
            tripId,
            editCat.id,
            editCat.name.trim() || origCat.name,
          );
        }

        const origItems = origCat.items;
        const keptItemIds = new Set(
          editCat.items.filter(i => !i._deleted && i.id > 0).map(i => i.id),
        );
        for (const origItem of origItems) {
          if (!keptItemIds.has(origItem.id)) {
            await deleteTripItem(tripId, origItem.id);
          }
        }

        for (const editItem of editCat.items.filter(
          i => !i._deleted && i.id > 0,
        )) {
          const origItem = origItems.find(i => i.id === editItem.id);
          if (!origItem) {
            continue;
          }

          const changed =
            editItem.name.trim() !== origItem.name ||
            editItem.quantity !== (origItem.quantity ?? null) ||
            (editItem.notes ?? null) !== (origItem.notes ?? null) ||
            (editItem.storage_location ?? null) !==
              (origItem.storage_location ?? null);

          if (changed) {
            await updateTripItem(tripId, editItem.id, {
              name: editItem.name.trim() || origItem.name,
              quantity: editItem.quantity,
              notes: editItem.notes ?? null,
              storage_location: editItem.storage_location,
            });
          }

          const origSpecs = origItem.specs ?? [];
          const keptSpecIds = new Set(
            editItem.specs.filter(s => s.id > 0).map(s => s.id),
          );
          for (const origSpec of origSpecs) {
            if (!keptSpecIds.has(origSpec.id)) {
              await deleteTripItemSpec(tripId, editItem.id, origSpec.id);
            }
          }
          for (const editSpec of editItem.specs.filter(s => s.id > 0)) {
            const origSpec = origSpecs.find(s => s.id === editSpec.id);
            if (!origSpec) {
              continue;
            }
            if (
              editSpec.name.trim() !== origSpec.name ||
              (editSpec.storage_location ?? null) !==
                (origSpec.storage_location ?? null)
            ) {
              await updateTripItemSpec(tripId, editItem.id, editSpec.id, {
                name: editSpec.name.trim() || origSpec.name,
                storage_location: editSpec.storage_location,
              });
            }
          }
          for (const editSpec of editItem.specs.filter(s => s.id < 0)) {
            await addTripItemSpec(tripId, editItem.id, {
              name: editSpec.name.trim() || '新規格',
              storage_location: editSpec.storage_location,
            });
          }
        }

        for (const editItem of editCat.items.filter(
          i => !i._deleted && i.id < 0,
        )) {
          const newItem = await addTripItem(tripId, editCat.id, {
            name: editItem.name.trim() || '新項目',
            quantity: editItem.quantity,
            notes: editItem.notes ?? null,
            storage_location: editItem.storage_location,
          });
          for (const spec of editItem.specs) {
            await addTripItemSpec(tripId, newItem.id, {
              name: spec.name.trim() || '新規格',
              storage_location: spec.storage_location,
            });
          }
        }
      }

      for (const editCat of edit.categories.filter(
        c => !c._deleted && c.id < 0,
      )) {
        const newCat = await addTripCategory(
          tripId,
          editCat.name.trim() || '新分類',
        );
        for (const editItem of editCat.items.filter(i => !i._deleted)) {
          const newItem = await addTripItem(tripId, newCat.id, {
            name: editItem.name.trim() || '新項目',
            quantity: editItem.quantity,
            notes: editItem.notes ?? null,
            storage_location: editItem.storage_location,
          });
          for (const spec of editItem.specs) {
            await addTripItemSpec(tripId, newItem.id, {
              name: spec.name.trim() || '新規格',
              storage_location: spec.storage_location,
            });
          }
        }
      }

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const visibleOccasions = edit.occasions.filter(o => !o._deleted);
  const visibleCategories = edit.categories.filter(c => !c._deleted);

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4'
      onWheel={e => e.stopPropagation()}
    >
      <div className='absolute inset-0 bg-black/50' onClick={onClose} />
      <div className='bg-card border-border relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-xl'>
        {/* Header */}
        <div className='border-border flex items-center gap-3 border-b px-6 py-4'>
          <Pencil size={16} className='text-muted-foreground shrink-0' />
          <h2 className='text-foreground flex-1 text-base font-semibold'>
            編輯行李清單
          </h2>
          <button
            onClick={onClose}
            className='text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1.5 transition-colors'
            aria-label='關閉'
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div
          ref={scrollBodyRef}
          className='flex-1 space-y-0 overflow-y-auto overscroll-contain'
        >
          {/* Occasions section */}
          <div className='border-border border-b px-6 py-5'>
            <h3 className='text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide'>
              時機
            </h3>
            <div className='space-y-2'>
              {visibleOccasions.map(occ => (
                <div
                  key={occ.id}
                  className='bg-muted/30 border-border flex items-center gap-2 rounded-lg border px-3 py-2'
                >
                  <input
                    value={occ.name}
                    onFocus={e => e.target.select()}
                    onChange={e => updateOccasionName(occ.id, e.target.value)}
                    className='text-foreground min-w-0 flex-1 bg-transparent text-sm focus:outline-none'
                    placeholder='時機名稱'
                  />
                  <button
                    onClick={() => removeOccasion(occ.id)}
                    disabled={visibleOccasions.length <= 1}
                    className='text-muted-foreground hover:text-destructive shrink-0 rounded p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30'
                    aria-label='刪除時機'
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button
                onClick={addOccasionLocal}
                className='text-muted-foreground hover:text-primary flex items-center gap-1 text-xs transition-colors'
              >
                <Plus size={12} />
                新增時機
              </button>
            </div>
          </div>

          {/* Categories section */}
          <div className='px-6 py-5'>
            <h3 className='text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide'>
              分類與項目
            </h3>
            <div className='space-y-2'>
              {visibleCategories.map(cat => {
                const isExpanded = expandedCats.has(cat.id);
                const visibleItems = cat.items.filter(i => !i._deleted);
                return (
                  <div
                    key={cat.id}
                    className='border-border overflow-hidden rounded-xl border'
                  >
                    {/* Category header */}
                    <div className='bg-muted/40 flex items-center gap-2 px-3 py-2.5'>
                      <button
                        onClick={() => toggleCatExpanded(cat.id)}
                        className='text-muted-foreground shrink-0'
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                      <input
                        value={cat.name}
                        onFocus={e => e.target.select()}
                        onChange={e =>
                          updateCategoryName(cat.id, e.target.value)
                        }
                        className='text-foreground min-w-0 flex-1 bg-transparent text-sm font-semibold focus:outline-none'
                        placeholder='分類名稱'
                      />
                      <span className='text-muted-foreground shrink-0 text-xs'>
                        {visibleItems.length} 項
                      </span>
                      <button
                        onClick={() => removeCategory(cat.id)}
                        className='text-muted-foreground hover:text-destructive shrink-0 rounded p-0.5 transition-colors'
                        aria-label='刪除分類'
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Items */}
                    {isExpanded && (
                      <div className='divide-border divide-y px-3 py-2'>
                        <div className='space-y-3 pb-2'>
                          {visibleItems.map((item, itemIdx) => (
                            <div
                              key={item.id}
                              className='bg-muted/20 border-border rounded-xl border p-3'
                            >
                              <div className='flex items-start gap-2'>
                                <span className='text-muted-foreground mt-1.5 w-5 shrink-0 text-xs'>
                                  {itemIdx + 1}.
                                </span>
                                <div className='min-w-0 flex-1 space-y-1.5'>
                                  <input
                                    value={item.name}
                                    onFocus={e => e.target.select()}
                                    onChange={e =>
                                      updateItem(cat.id, item.id, {
                                        name: e.target.value,
                                      })
                                    }
                                    className='text-foreground w-full bg-transparent text-sm font-medium focus:outline-none'
                                    placeholder='項目名稱'
                                  />
                                  <div className='flex items-center gap-3'>
                                    <div className='flex items-center gap-1'>
                                      <span className='text-muted-foreground text-xs'>
                                        x
                                      </span>
                                      <input
                                        type='number'
                                        min={1}
                                        value={item.quantity ?? ''}
                                        onChange={e => {
                                          const v = e.target.value;
                                          updateItem(cat.id, item.id, {
                                            quantity:
                                              v === '' ? null : Number(v),
                                          });
                                        }}
                                        placeholder='數量'
                                        className='text-muted-foreground w-14 bg-transparent text-xs focus:outline-none'
                                      />
                                    </div>
                                    <input
                                      value={item.notes ?? ''}
                                      onChange={e =>
                                        updateItem(cat.id, item.id, {
                                          notes: e.target.value || null,
                                        })
                                      }
                                      placeholder='補充說明'
                                      className='text-muted-foreground min-w-0 flex-1 bg-transparent text-xs focus:outline-none'
                                    />
                                  </div>
                                  <div className='flex items-center gap-3'>
                                    <StorageCheckboxes
                                      value={item.storage_location}
                                      onChange={loc =>
                                        updateItem(cat.id, item.id, {
                                          storage_location: loc,
                                        })
                                      }
                                    />
                                  </div>
                                  {/* Specs */}
                                  <div className='border-border mt-0.5 space-y-1.5 border-l-2 pl-3'>
                                    {item.specs.map((spec, specIdx) => (
                                      <div
                                        key={spec.id}
                                        className='flex items-center gap-2'
                                      >
                                        <span className='text-muted-foreground w-4 shrink-0 text-xs'>
                                          {specIdx + 1}.
                                        </span>
                                        <input
                                          value={spec.name}
                                          onFocus={e => e.target.select()}
                                          onChange={e =>
                                            updateSpec(
                                              cat.id,
                                              item.id,
                                              spec.id,
                                              { name: e.target.value },
                                            )
                                          }
                                          placeholder='規格名稱'
                                          className='text-foreground/80 min-w-0 flex-1 bg-transparent text-xs focus:outline-none'
                                        />
                                        <StorageCheckboxes
                                          value={spec.storage_location}
                                          onChange={loc =>
                                            updateSpec(
                                              cat.id,
                                              item.id,
                                              spec.id,
                                              {
                                                storage_location: loc,
                                              },
                                            )
                                          }
                                          compact
                                        />
                                        <button
                                          onClick={() =>
                                            removeSpec(cat.id, item.id, spec.id)
                                          }
                                          className='text-muted-foreground hover:text-destructive shrink-0 rounded p-0.5 transition-colors'
                                          aria-label='刪除規格'
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      onClick={() =>
                                        addSpecLocal(cat.id, item.id)
                                      }
                                      className='text-muted-foreground hover:text-primary flex items-center gap-1 text-xs transition-colors'
                                    >
                                      <Plus size={11} />
                                      新增規格
                                    </button>
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeItem(cat.id, item.id)}
                                  className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive mt-0.5 shrink-0 rounded-md p-1 transition-colors'
                                  aria-label='刪除項目'
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className='pt-2'>
                          <button
                            onClick={() => addItemLocal(cat.id)}
                            className='text-muted-foreground hover:text-primary flex items-center gap-1 text-xs transition-colors'
                          >
                            <Plus size={12} />
                            新增項目
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                onClick={addCategoryLocal}
                className='border-border text-muted-foreground hover:border-primary hover:text-primary flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm transition-colors'
              >
                <Plus size={14} />
                新增分類
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='border-border flex items-center justify-end gap-3 border-t px-6 py-4'>
          <button
            onClick={onClose}
            className='text-muted-foreground hover:text-foreground px-4 py-2 text-sm transition-colors'
          >
            取消
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50'
          >
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}
