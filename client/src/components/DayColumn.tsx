import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { MapPin, Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';

import type { Attraction, DayPlan, TravelConnection } from '@/types';

import AttractionCard from './AttractionCard';
import TravelConnectionItem from './TravelConnectionItem';

interface Props {
  day: DayPlan;
  dayIndex: number;
  onAddAttraction: (dayIndex: number) => void;
  onEditAttraction: (dayIndex: number, attraction: Attraction) => void;
  onDeleteAttraction: (dayIndex: number, attractionId: number) => void;
  onDuplicateAttraction: (dayIndex: number, attraction: Attraction) => void;
  onEditConnection: (dayIndex: number, connection: TravelConnection) => void;
  onAddConnection: (dayIndex: number, fromId: number, toId: number) => void;
  onAddLocation: (dayIndex: number, name: string) => void;
  onUpdateLocation: (
    dayIndex: number,
    locationId: number,
    name: string,
  ) => void;
  onDeleteLocation: (dayIndex: number, locationId: number) => void;
}

export default function DayColumn({
  day,
  dayIndex,
  onAddAttraction,
  onEditAttraction,
  onDeleteAttraction,
  onDuplicateAttraction,
  onEditConnection,
  onAddConnection,
  onAddLocation,
  onUpdateLocation,
  onDeleteLocation,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dayIndex}` });

  const [editingLocationId, setEditingLocationId] = useState<number | null>(
    null,
  );
  const [editValue, setEditValue] = useState('');
  const [addingLocation, setAddingLocation] = useState(false);
  const [addValue, setAddValue] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  const dateLabel = (() => {
    try {
      return format(parseISO(day.date), 'M/d (EEE)', { locale: zhTW });
    } catch {
      return day.date;
    }
  })();

  const startEditing = (locationId: number, currentName: string) => {
    setEditingLocationId(locationId);
    setEditValue(currentName);
  };

  const commitEdit = (locationId: number) => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onUpdateLocation(dayIndex, locationId, trimmed);
    }
    setEditingLocationId(null);
  };

  const commitAdd = () => {
    const trimmed = addValue.trim();
    if (trimmed) {
      onAddLocation(dayIndex, trimmed);
    }
    setAddValue('');
    setAddingLocation(false);
  };

  const startAdding = () => {
    setAddingLocation(true);
    setTimeout(() => addInputRef.current?.focus(), 0);
  };

  return (
    <div className='flex w-80 shrink-0 flex-col'>
      {/* Column header */}
      <div className='mb-3 px-1 text-center'>
        <span className='bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold'>
          第 {day.day} 天
        </span>
        <p className='text-muted-foreground mt-1 text-sm'>{dateLabel}</p>

        {/* Location tags */}
        <div className='mt-2 flex flex-wrap items-center justify-center gap-1.5'>
          {day.locations.map(loc =>
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
                  onClick={() => onDeleteLocation(dayIndex, loc.id)}
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
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex min-h-[200px] flex-1 flex-col gap-0 rounded-2xl p-3 transition-colors ${
          isOver
            ? 'border-primary/30 bg-primary/5 border-2 border-dashed'
            : 'bg-muted/30 border-2 border-transparent'
        }`}
      >
        <SortableContext
          items={day.attractions.map(a => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {day.attractions.map((attraction, i) => {
            const nextAttraction = day.attractions[i + 1];
            const conn = nextAttraction
              ? day.connections.find(
                  c =>
                    c.fromAttractionId === attraction.id &&
                    c.toAttractionId === nextAttraction.id,
                )
              : undefined;

            return (
              <div key={attraction.id}>
                <AttractionCard
                  attraction={attraction}
                  onEdit={a => onEditAttraction(dayIndex, a)}
                  onDelete={id => onDeleteAttraction(dayIndex, id)}
                  onDuplicate={a => onDuplicateAttraction(dayIndex, a)}
                />
                {nextAttraction &&
                  (conn ? (
                    <TravelConnectionItem
                      connection={conn}
                      onEdit={c => onEditConnection(dayIndex, c)}
                    />
                  ) : (
                    <div className='my-1 flex items-center gap-2 px-3'>
                      <div className='flex w-6 shrink-0 flex-col items-center'>
                        <div className='bg-border h-4 w-px' />
                      </div>
                      <button
                        onClick={() =>
                          onAddConnection(
                            dayIndex,
                            attraction.id,
                            nextAttraction.id,
                          )
                        }
                        className='text-muted-foreground hover:text-primary py-0.5 text-xs transition-colors'
                      >
                        + 新增移動資訊
                      </button>
                    </div>
                  ))}
              </div>
            );
          })}
        </SortableContext>

        <button
          onClick={() => onAddAttraction(dayIndex)}
          className='border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary mt-2 flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-2 text-sm transition-all'
        >
          <Plus size={15} />
          新增景點
        </button>
      </div>
    </div>
  );
}
