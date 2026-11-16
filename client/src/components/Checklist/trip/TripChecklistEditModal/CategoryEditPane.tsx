import { FIELD_LIMITS } from '@tripdeck/shared';
import { Plus, Trash2 } from 'lucide-react';
import type { RefObject } from 'react';

import EditableItemRow from '../../shared/EditableItemRow';
import type { EditCategory, EditItem, EditSpec } from '../../shared/types';

interface Props {
  category: EditCategory;
  scrollBodyRef: RefObject<HTMLDivElement | null>;
  onUpdateName: (catId: number, name: string) => void;
  onRemove: (catId: number) => void;
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

/**
 * Editor for the selected category of a trip checklist draft: its name,
 * items and specs. Every callback is prefixed with the category id so the
 * parent can route edits into the shared draft.
 */
export default function CategoryEditPane({
  category,
  scrollBodyRef,
  onUpdateName,
  onRemove,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onAddSpec,
  onUpdateSpec,
  onDeleteSpec,
}: Props) {
  const visibleItems = category.items.filter(i => !i._deleted);

  return (
    <>
      <div className='flex items-center gap-3 border-b border-border px-5 py-4'>
        <input
          aria-label='分類名稱'
          value={category.name}
          maxLength={FIELD_LIMITS.name}
          onFocus={e => e.target.select()}
          onChange={e => onUpdateName(category.id, e.target.value)}
          className='min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-base font-semibold text-foreground focus:border-primary focus:outline-hidden'
          placeholder='分類名稱'
        />
        <button
          type='button'
          onClick={() => onRemove(category.id)}
          className='flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive'
          aria-label='刪除分類'
        >
          <Trash2 size={15} />
          刪除分類
        </button>
      </div>

      <div
        ref={scrollBodyRef}
        className='flex-1 overflow-y-auto overscroll-contain px-5 py-4'
      >
        <div className='mx-auto max-w-3xl space-y-3'>
          {visibleItems.map((item, itemIdx) => (
            <EditableItemRow
              key={item.id}
              item={item}
              index={itemIdx}
              onUpdateItem={(itemId, fields) =>
                onUpdateItem(category.id, itemId, fields)
              }
              onDeleteItem={itemId => onDeleteItem(category.id, itemId)}
              onUpdateSpec={(itemId, specId, fields) =>
                onUpdateSpec(category.id, itemId, specId, fields)
              }
              onDeleteSpec={(itemId, specId) =>
                onDeleteSpec(category.id, itemId, specId)
              }
              onAddSpec={itemId => onAddSpec(category.id, itemId)}
            />
          ))}

          <button
            type='button'
            onClick={() => onAddItem(category.id)}
            className='flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary'
          >
            <Plus size={15} />
            新增項目
          </button>
        </div>
      </div>
    </>
  );
}
