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
      <h3 className='text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide'>
        分類與項目
      </h3>
      <div className='space-y-2'>
        {categories.map(cat => {
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
                  onClick={() => onToggleExpand(cat.id)}
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
                  onChange={e => onUpdateName(cat.id, e.target.value)}
                  className='text-foreground min-w-0 flex-1 bg-transparent text-sm font-semibold focus:outline-none'
                  placeholder='分類名稱'
                />
                <span className='text-muted-foreground shrink-0 text-xs'>
                  {visibleItems.length} 項
                </span>
                <button
                  onClick={() => onRemove(cat.id)}
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
          onClick={onAddCategory}
          className='border-border text-muted-foreground hover:border-primary hover:text-primary flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm transition-colors'
        >
          <Plus size={14} />
          新增分類
        </button>
      </div>
    </div>
  );
}
