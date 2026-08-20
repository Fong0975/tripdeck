import { Plus, Trash2 } from 'lucide-react';

import EditSpecRow from './EditSpecRow';
import StorageCheckboxes from './StorageCheckboxes';
import type { EditItem, EditSpec } from './types';

interface Props {
  item: EditItem;
  index: number;
  /** Tighter spacing for use inside the nested trip-checklist category view. */
  compact?: boolean;
  onUpdateItem: (itemId: number, fields: Partial<EditItem>) => void;
  onDeleteItem: (itemId: number) => void;
  onUpdateSpec: (
    itemId: number,
    specId: number,
    fields: Partial<EditSpec>,
  ) => void;
  onDeleteSpec: (itemId: number, specId: number) => void;
  onAddSpec: (itemId: number) => void;
}

export default function EditableItemRow({
  item,
  index,
  compact = false,
  onUpdateItem,
  onDeleteItem,
  onUpdateSpec,
  onDeleteSpec,
  onAddSpec,
}: Props) {
  return (
    <div
      className={`border-border rounded-xl border ${compact ? 'bg-muted/20 p-3' : 'bg-muted/30 p-4'}`}
    >
      <div className='flex items-start gap-2'>
        <span
          className={`text-muted-foreground w-5 shrink-0 text-xs ${compact ? 'mt-1.5' : 'mt-2'}`}
        >
          {index + 1}.
        </span>
        <div className='min-w-0 flex-1 space-y-1.5'>
          <input
            value={item.name}
            onFocus={e => e.target.select()}
            onChange={e => onUpdateItem(item.id, { name: e.target.value })}
            className='text-foreground w-full bg-transparent text-sm font-medium focus:outline-none'
            placeholder='項目名稱'
          />

          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-1'>
              <span className='text-muted-foreground text-xs'>x</span>
              <input
                type='number'
                min={1}
                value={item.quantity ?? ''}
                onChange={e => {
                  const v = e.target.value;
                  onUpdateItem(item.id, {
                    quantity: v === '' ? null : Number(v),
                  });
                }}
                placeholder='數量'
                className={`text-muted-foreground bg-transparent text-xs focus:outline-none ${compact ? 'w-14' : 'w-16'}`}
              />
            </div>
            <input
              value={item.notes ?? ''}
              onChange={e =>
                onUpdateItem(item.id, { notes: e.target.value || null })
              }
              placeholder='補充說明'
              className='text-muted-foreground min-w-0 flex-1 bg-transparent text-xs focus:outline-none'
            />
          </div>

          <div className='flex items-center gap-3'>
            <StorageCheckboxes
              value={item.storage_location}
              onChange={loc => onUpdateItem(item.id, { storage_location: loc })}
            />
          </div>

          {/* Specs */}
          <div
            className={`border-border space-y-1.5 border-l-2 pl-3 ${compact ? 'mt-0.5' : 'mt-1'}`}
          >
            {item.specs.map((spec, specIdx) => (
              <EditSpecRow
                key={spec.id}
                spec={spec}
                index={specIdx}
                compact={compact}
                onUpdate={fields => onUpdateSpec(item.id, spec.id, fields)}
                onDelete={() => onDeleteSpec(item.id, spec.id)}
              />
            ))}
            <button
              onClick={() => onAddSpec(item.id)}
              className='text-muted-foreground hover:text-primary flex items-center gap-1 text-xs transition-colors'
            >
              <Plus size={11} />
              新增規格
            </button>
          </div>
        </div>

        <button
          onClick={() => onDeleteItem(item.id)}
          className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive mt-0.5 shrink-0 rounded-md p-1 transition-colors'
          aria-label='刪除項目'
        >
          <Trash2 size={compact ? 13 : 14} />
        </button>
      </div>
    </div>
  );
}
