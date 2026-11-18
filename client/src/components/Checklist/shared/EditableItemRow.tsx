import { FIELD_LIMITS } from '@tripdeck/shared';
import { Plus, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { useLocationLabelSet } from '../locations/LocationLabelsContext';

import { summarizeSpecLocations } from './checklistUtils';
import EditSpecRow from './EditSpecRow';
import ItemActionBar from './ItemActionBar';
import LocationPicker from './LocationPicker';
import StorageBadges from './StorageBadges';
import type { EditItem, EditSpec } from './types';

const SPEC_LOCATION_HINT = '存放位置由規格決定';

interface Props {
  item: EditItem;
  index: number;
  onUpdateItem: (itemId: number, fields: Partial<EditItem>) => void;
  onDeleteItem: (itemId: number) => void;
  onUpdateSpec: (
    itemId: number,
    specId: number,
    fields: Partial<EditSpec>,
  ) => void;
  onDeleteSpec: (itemId: number, specId: number) => void;
  onAddSpec: (itemId: number) => void;
  /** Drag handle from a surrounding `SortableRow`; omitted when not sortable. */
  dragHandle?: ReactNode;
  /** Opens the move-to-category flow; the move button is hidden without it. */
  onMoveItem?: (item: EditItem) => void;
  moveDisabled?: boolean;
}

export default function EditableItemRow({
  item,
  index,
  onUpdateItem,
  onDeleteItem,
  onUpdateSpec,
  onDeleteSpec,
  onAddSpec,
  dragHandle,
  onMoveItem,
  moveDisabled,
}: Props) {
  const { names } = useLocationLabelSet();
  const hasSpecs = item.specs.length > 0;

  return (
    <div className='rounded-xl border border-border bg-muted/30 p-4'>
      <div className='flex items-start gap-2'>
        {dragHandle && <span className='mt-1.5'>{dragHandle}</span>}
        <span className='mt-2 w-6 shrink-0 text-sm text-muted-foreground'>
          {index + 1}.
        </span>
        <div className='min-w-0 flex-1 space-y-2.5'>
          <input
            value={item.name}
            maxLength={FIELD_LIMITS.name}
            onFocus={e => e.target.select()}
            onChange={e => onUpdateItem(item.id, { name: e.target.value })}
            className='w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-base font-medium text-foreground focus:border-primary focus:outline-hidden'
            placeholder='項目名稱'
          />

          <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
            <div className='flex items-center gap-1'>
              <span className='text-sm text-muted-foreground'>x</span>
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
                className='w-20 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-muted-foreground focus:border-primary focus:outline-hidden'
              />
            </div>
            <input
              value={item.notes ?? ''}
              onChange={e =>
                onUpdateItem(item.id, { notes: e.target.value || null })
              }
              placeholder='補充說明'
              className='min-w-0 flex-1 basis-48 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-muted-foreground focus:border-primary focus:outline-hidden'
            />
          </div>

          <div
            role='group'
            aria-label='項目存放位置'
            className='flex items-center gap-3'
          >
            {hasSpecs ? (
              <StorageBadges
                value={summarizeSpecLocations(item.specs, names)}
              />
            ) : (
              <LocationPicker
                value={item.storage_location}
                onChange={loc =>
                  onUpdateItem(item.id, { storage_location: loc })
                }
              />
            )}
            {hasSpecs && (
              <span
                role='img'
                aria-label={SPEC_LOCATION_HINT}
                title={SPEC_LOCATION_HINT}
                className='flex text-muted-foreground'
              >
                <TriangleAlert size={14} />
              </span>
            )}
          </div>

          {/* Specs */}
          <div className='mt-3 space-y-2.5 border-l-4 border-primary/40 pl-4'>
            {item.specs.map((spec, specIdx) => (
              <EditSpecRow
                key={spec.id}
                spec={spec}
                index={specIdx}
                onUpdate={fields => onUpdateSpec(item.id, spec.id, fields)}
                onDelete={() => onDeleteSpec(item.id, spec.id)}
              />
            ))}
            <button
              onClick={() => onAddSpec(item.id)}
              className='flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary'
            >
              <Plus size={14} />
              新增規格
            </button>
          </div>
        </div>
      </div>

      <ItemActionBar
        onMove={onMoveItem ? () => onMoveItem(item) : undefined}
        moveDisabled={moveDisabled}
        onDelete={() => onDeleteItem(item.id)}
      />
    </div>
  );
}
