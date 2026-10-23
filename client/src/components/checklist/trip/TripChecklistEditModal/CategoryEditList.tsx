import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';

import EditableItemRow from '../../shared/EditableItemRow';
import type { EditCategory, EditItem, EditSpec } from '../../shared/types';

interface Props {
  categories: EditCategory[];
  expandedCats: Set<number>;
  onToggleExpand: (catId: number) => void;
  onUpdateName: (catId: number, name: string) => void;
  onRemove: (catId: number) => void;
  onAddCategory: () => void;
  onAddItem: (catId: number) => void;
  onUpdateItem: (
    catId: number,
    itemId: number,
    fields: Partial<EditItem>,
  ) => void;
  onDeleteItem: (catId: number, itemId: number) => void;
  onAddSpec: (catId: number, itemId: number) => void;
  onUpdateSpec: (
    catId: number,
    itemId: number,
    specId: number,
    fields: Partial<EditSpec>,
  ) => void;
  onDeleteSpec: (catId: number, itemId: number, specId: number) => void;
}

export default function CategoryEditList({
  categories,
  expandedCats,
  onToggleExpand,
  onUpdateName,
  onRemove,
  onAddCategory,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onAddSpec,
  onUpdateSpec,
  onDeleteSpec,
}: Props) {
  return (
    <div className='px-6 py-5'>
      <h3 className='mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
        分類與項目
      </h3>
      <div className='space-y-2'>
        {categories.map(cat => {
          const isExpanded = expandedCats.has(cat.id);
          const visibleItems = cat.items.filter(i => !i._deleted);
          return (
            <div
              key={cat.id}
              className='overflow-hidden rounded-xl border border-border'
            >
              {/* Category header */}
              <div className='flex items-center gap-2 bg-muted/40 px-3 py-2.5'>
                <button
                  onClick={() => onToggleExpand(cat.id)}
                  className='shrink-0 text-muted-foreground'
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
                  /* v8 ignore next -- select-all-on-focus convenience UX, low risk */
                  onFocus={e => e.target.select()}
                  onChange={e => onUpdateName(cat.id, e.target.value)}
                  className='min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground focus:outline-hidden'
                  placeholder='分類名稱'
                />
                <span className='shrink-0 text-xs text-muted-foreground'>
                  {visibleItems.length} 項
                </span>
                <button
                  onClick={() => onRemove(cat.id)}
                  className='shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-destructive'
                  aria-label='刪除分類'
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Items */}
              {isExpanded && (
                <div className='divide-y divide-border px-3 py-2'>
                  <div className='space-y-3 pb-2'>
                    {visibleItems.map((item, itemIdx) => (
                      <EditableItemRow
                        key={item.id}
                        item={item}
                        index={itemIdx}
                        compact
                        onUpdateItem={(itemId, fields) =>
                          onUpdateItem(cat.id, itemId, fields)
                        }
                        onDeleteItem={itemId => onDeleteItem(cat.id, itemId)}
                        onUpdateSpec={(itemId, specId, fields) =>
                          onUpdateSpec(cat.id, itemId, specId, fields)
                        }
                        onDeleteSpec={(itemId, specId) =>
                          onDeleteSpec(cat.id, itemId, specId)
                        }
                        onAddSpec={itemId => onAddSpec(cat.id, itemId)}
                      />
                    ))}
                  </div>
                  <div className='pt-2'>
                    <button
                      onClick={() => onAddItem(cat.id)}
                      className='flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary'
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
          onClick={onAddCategory}
          className='flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary'
        >
          <Plus size={14} />
          新增分類
        </button>
      </div>
    </div>
  );
}
