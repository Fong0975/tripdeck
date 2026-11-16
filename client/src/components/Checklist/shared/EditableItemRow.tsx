import { FIELD_LIMITS } from '@tripdeck/shared';
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
      /* v8 ignore next -- compact/regular are both purely cosmetic spacing variants */
      className={`rounded-xl border border-border ${compact ? 'bg-muted/20 p-3' : 'bg-muted/30 p-4'}`}
    >
      <div className='flex items-start gap-2'>
        <span
          /* v8 ignore next -- compact/regular are both purely cosmetic spacing variants */
          className={`shrink-0 text-muted-foreground ${compact ? 'mt-1.5 w-5 text-xs' : 'mt-2 w-6 text-sm'}`}
        >
          {index + 1}.
        </span>
        <div
          /* v8 ignore next -- compact/regular are both purely cosmetic spacing variants */
          className={`min-w-0 flex-1 ${compact ? 'space-y-1.5' : 'space-y-2.5'}`}
        >
          <input
            value={item.name}
            maxLength={FIELD_LIMITS.name}
            onFocus={e => e.target.select()}
            onChange={e => onUpdateItem(item.id, { name: e.target.value })}
            /* v8 ignore next -- compact/regular are both purely cosmetic input variants */
            className={`w-full font-medium text-foreground focus:outline-hidden ${
              compact
                ? 'bg-transparent text-sm'
                : 'rounded-md border border-border bg-background px-2.5 py-1.5 text-base focus:border-primary'
            }`}
            placeholder='項目名稱'
          />

          <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
            <div className='flex items-center gap-1'>
              <span
                /* v8 ignore next -- compact/regular are both purely cosmetic text variants */
                className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}
              >
                x
              </span>
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
                /* v8 ignore next -- compact/regular are both purely cosmetic width variants */
                className={`text-muted-foreground focus:outline-hidden ${
                  compact
                    ? 'w-14 bg-transparent text-xs'
                    : 'w-20 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary'
                }`}
              />
            </div>
            <input
              value={item.notes ?? ''}
              onChange={e =>
                onUpdateItem(item.id, { notes: e.target.value || null })
              }
              placeholder='補充說明'
              /* v8 ignore next -- compact/regular are both purely cosmetic input variants */
              className={`min-w-0 flex-1 text-muted-foreground focus:outline-hidden ${
                compact
                  ? 'bg-transparent text-xs'
                  : 'basis-48 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary'
              }`}
            />
          </div>

          <div className='flex items-center gap-3'>
            <StorageCheckboxes
              value={item.storage_location}
              onChange={loc => onUpdateItem(item.id, { storage_location: loc })}
              large={!compact}
            />
          </div>

          {/* Specs */}
          <div
            /* v8 ignore next -- compact/regular are both purely cosmetic spacing variants */
            className={`${
              compact
                ? 'mt-0.5 space-y-1.5 border-l-2 border-border pl-3'
                : 'mt-3 space-y-2.5 border-l-4 border-primary/40 pl-4'
            }`}
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
              /* v8 ignore next -- compact/regular are both purely cosmetic text variants */
              className={`flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary ${compact ? 'text-xs' : 'text-sm'}`}
            >
              <Plus size={compact ? 11 : 14} />
              新增規格
            </button>
          </div>
        </div>

        <button
          onClick={() => onDeleteItem(item.id)}
          className='mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive'
          aria-label='刪除項目'
        >
          {/* v8 ignore next -- compact/regular are both purely cosmetic icon-size variants */}
          <Trash2 size={compact ? 13 : 16} />
        </button>
      </div>
    </div>
  );
}
