import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Plus } from 'lucide-react';

import type { DayPlan, Attraction, TravelConnection } from '@/types';

import AttractionCard from './AttractionCard';
import TravelConnectionItem from './TravelConnectionItem';

interface Props {
  day: DayPlan;
  dayIndex: number;
  onAddAttraction: (dayIndex: number) => void;
  onEditAttraction: (dayIndex: number, attraction: Attraction) => void;
  onDeleteAttraction: (dayIndex: number, attractionId: string) => void;
  onEditConnection: (dayIndex: number, connection: TravelConnection) => void;
  onAddConnection: (dayIndex: number, fromId: string, toId: string) => void;
}

export default function DayColumn({
  day,
  dayIndex,
  onAddAttraction,
  onEditAttraction,
  onDeleteAttraction,
  onEditConnection,
  onAddConnection,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dayIndex}` });

  const dateLabel = (() => {
    try {
      return format(parseISO(day.date), 'M/d (EEE)', { locale: zhTW });
    } catch {
      return day.date;
    }
  })();

  return (
    <div className='flex w-64 shrink-0 flex-col'>
      {/* Column header */}
      <div className='mb-3 px-1 text-center'>
        <span className='rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary'>
          第 {day.day} 天
        </span>
        <p className='mt-1 text-sm text-muted-foreground'>{dateLabel}</p>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex min-h-[200px] flex-1 flex-col gap-0 rounded-2xl p-3 transition-colors ${
          isOver
            ? 'border-2 border-dashed border-primary/30 bg-primary/5'
            : 'border-2 border-transparent bg-muted/30'
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
                        <div className='h-4 w-px bg-border' />
                      </div>
                      <button
                        onClick={() =>
                          onAddConnection(
                            dayIndex,
                            attraction.id,
                            nextAttraction.id,
                          )
                        }
                        className='py-0.5 text-xs text-muted-foreground transition-colors hover:text-primary'
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
          className='mt-2 flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border py-2 text-sm text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary'
        >
          <Plus size={15} />
          新增景點
        </button>
      </div>
    </div>
  );
}
