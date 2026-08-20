import { MapPin, Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';

import type { DayLocation } from '@/types';

interface Props {
  locations: DayLocation[];
  dayIndex: number;
  onAdd: (dayIndex: number, name: string) => void;
  onUpdate: (dayIndex: number, locationId: number, name: string) => void;
  onDelete: (dayIndex: number, locationId: number) => void;
}

/** Editable location tags shown under a day's header, used for weather lookup. */
export default function LocationChips({
  locations,
  dayIndex,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [editingLocationId, setEditingLocationId] = useState<number | null>(
    null,
  );
  const [editValue, setEditValue] = useState('');
  const [addingLocation, setAddingLocation] = useState(false);
  const [addValue, setAddValue] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  const startEditing = (locationId: number, currentName: string) => {
    setEditingLocationId(locationId);
    setEditValue(currentName);
  };

  const commitEdit = (locationId: number) => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onUpdate(dayIndex, locationId, trimmed);
    }
    setEditingLocationId(null);
  };

  const commitAdd = () => {
    const trimmed = addValue.trim();
    if (trimmed) {
      onAdd(dayIndex, trimmed);
    }
    setAddValue('');
    setAddingLocation(false);
  };

  const startAdding = () => {
    setAddingLocation(true);
    setTimeout(() => addInputRef.current?.focus(), 0);
  };

  return (
    <div className='mt-2 flex flex-wrap items-center justify-center gap-1.5'>
      {locations.map(loc =>
        editingLocationId === loc.id ? (
          <input
            key={loc.id}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={() => commitEdit(loc.id)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                commitEdit(loc.id);
              }
              if (e.key === 'Escape') {
                setEditingLocationId(null);
              }
            }}
            autoFocus
            className='border-primary text-foreground w-24 rounded border bg-transparent px-1.5 py-0.5 text-center text-xs focus:outline-none'
          />
        ) : (
          <span
            key={loc.id}
            className='bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-2 py-0.5 text-xs'
          >
            <MapPin size={10} className='shrink-0' />
            <button
              onClick={() => startEditing(loc.id, loc.name)}
              className='hover:text-foreground max-w-[100px] truncate transition-colors'
            >
              {loc.name}
            </button>
            <button
              onClick={() => onDelete(dayIndex, loc.id)}
              className='hover:text-destructive shrink-0 transition-colors'
              aria-label='刪除地區'
            >
              <X size={10} />
            </button>
          </span>
        ),
      )}

      {addingLocation ? (
        <input
          ref={addInputRef}
          value={addValue}
          onChange={e => setAddValue(e.target.value)}
          onBlur={commitAdd}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              commitAdd();
            }
            if (e.key === 'Escape') {
              setAddValue('');
              setAddingLocation(false);
            }
          }}
          placeholder='地區名稱'
          className='border-primary text-foreground w-24 rounded border bg-transparent px-1.5 py-0.5 text-center text-xs focus:outline-none'
        />
      ) : (
        <button
          onClick={startAdding}
          className='text-muted-foreground hover:text-primary flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs transition-colors'
        >
          <Plus size={10} />
          地區
        </button>
      )}
    </div>
  );
}
