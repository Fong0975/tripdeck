import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

import { useMapsStatus } from '@/hooks/useMapsStatus';
import { useWeatherEnabled } from '@/hooks/useWeatherEnabled';
import type { Attraction, DayPlan, TravelConnection } from '@/types';
import { isPastDate } from '@/utils/date';
import { formatDayDate } from '@/utils/dayLabel';

import AttractionCard from '../AttractionCard';
import DayWeather from '../DayWeather';
import TravelConnectionItem from '../TravelConnectionItem';

import DayNotesSection from './DayNotesSection';
import LocationChips from './LocationChips';

interface Props {
  day: DayPlan;
  dayIndex: number;
  onEditDayNote: (dayIndex: number) => void;
  onOpenDayMap: (dayIndex: number) => void;
  onAddAttraction: (dayIndex: number) => void;
  onEditAttraction: (dayIndex: number, attraction: Attraction) => void;
  onDeleteAttraction: (dayIndex: number, attractionId: number) => void;
  onDuplicateAttraction: (dayIndex: number, attraction: Attraction) => void;
  onEditConnection: (dayIndex: number, connection: TravelConnection) => void;
  onDeleteConnection: (dayIndex: number, connectionId: number) => void;
  onAddConnection: (dayIndex: number, fromId: number, toId: number) => void;
  onAddLocation: (dayIndex: number, name: string) => void;
  onUpdateLocation: (
    dayIndex: number,
    locationId: number,
    name: string,
  ) => void;
  onDeleteLocation: (dayIndex: number, locationId: number) => void;
}

/** Builds the lookup key for the connection between two attractions. */
function connectionKey(fromId: number, toId: number): string {
  return `${fromId}->${toId}`;
}

/**
 * One droppable day lane on the itinerary board: header, notes, locations,
 * weather, and the sortable attraction cards with the travel connections
 * between consecutive attractions.
 *
 * Memoized, and every prop it hands to its cards and connection items is
 * kept referentially stable, so editing one day does not re-render the
 * cards of the other days.
 */
function DayColumn({
  day,
  dayIndex,
  onEditDayNote,
  onOpenDayMap,
  onAddAttraction,
  onEditAttraction,
  onDeleteAttraction,
  onDuplicateAttraction,
  onEditConnection,
  onDeleteConnection,
  onAddConnection,
  onAddLocation,
  onUpdateLocation,
  onDeleteLocation,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dayIndex}` });
  const isWeatherEnabled = useWeatherEnabled();
  const mapAvailability = useMapsStatus();

  const dateLabel = formatDayDate(day.date, 'M/d (EEE)');

  const isPast = isPastDate(day.date);

  const attractionIds = useMemo(
    () => day.attractions.map(a => a.id),
    [day.attractions],
  );

  const connectionsByPair = useMemo(() => {
    const map = new Map<string, TravelConnection>();
    for (const c of day.connections) {
      const key = connectionKey(c.fromAttractionId, c.toAttractionId);
      // Keep the first match, mirroring `Array.prototype.find` semantics.
      if (!map.has(key)) {
        map.set(key, c);
      }
    }
    return map;
  }, [day.connections]);

  const handleEditAttraction = useCallback(
    (attraction: Attraction) => onEditAttraction(dayIndex, attraction),
    [dayIndex, onEditAttraction],
  );
  const handleDeleteAttraction = useCallback(
    (attractionId: number) => onDeleteAttraction(dayIndex, attractionId),
    [dayIndex, onDeleteAttraction],
  );
  const handleDuplicateAttraction = useCallback(
    (attraction: Attraction) => onDuplicateAttraction(dayIndex, attraction),
    [dayIndex, onDuplicateAttraction],
  );
  const handleEditConnection = useCallback(
    (connection: TravelConnection) => onEditConnection(dayIndex, connection),
    [dayIndex, onEditConnection],
  );
  const handleDeleteConnection = useCallback(
    (connectionId: number) => onDeleteConnection(dayIndex, connectionId),
    [dayIndex, onDeleteConnection],
  );

  return (
    <div className='flex w-80 shrink-0 flex-col'>
      {/* Sticky column header: stays pinned to the top of the scrollable board while the day lane scrolls */}
      <div className='sticky top-0 z-10 bg-background px-1 pt-1 pb-2 text-center'>
        <span className='rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary'>
          第 {day.day} 天
        </span>
        <p className='mt-1 text-sm text-muted-foreground'>{dateLabel}</p>
      </div>

      <div className='mb-3 px-1 text-center'>
        <DayNotesSection
          day={day}
          onEdit={() => onEditDayNote(dayIndex)}
          onOpenMap={() => onOpenDayMap(dayIndex)}
          mapAvailability={mapAvailability}
        />

        <LocationChips
          locations={day.locations}
          dayIndex={dayIndex}
          onAdd={onAddLocation}
          onUpdate={onUpdateLocation}
          onDelete={onDeleteLocation}
        />

        {isWeatherEnabled && !isPast && day.locations.length > 0 && (
          <DayWeather locations={day.locations} date={day.date} />
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex min-h-50 flex-1 flex-col gap-0 rounded-2xl p-3 transition-colors ${
          /* v8 ignore next 3 -- isOver drag-over styling requires simulating an active dnd-kit drag state */
          isOver
            ? 'border-2 border-dashed border-primary/30 bg-primary/5'
            : 'border-2 border-transparent bg-muted/30'
        }`}
      >
        <SortableContext
          items={attractionIds}
          strategy={verticalListSortingStrategy}
        >
          {day.attractions.map((attraction, i) => {
            const nextAttraction = day.attractions[i + 1];
            const conn = nextAttraction
              ? connectionsByPair.get(
                  connectionKey(attraction.id, nextAttraction.id),
                )
              : undefined;

            return (
              <div key={attraction.id}>
                <AttractionCard
                  attraction={attraction}
                  onEdit={handleEditAttraction}
                  onDelete={handleDeleteAttraction}
                  onDuplicate={handleDuplicateAttraction}
                />
                {nextAttraction &&
                  (conn ? (
                    <TravelConnectionItem
                      connection={conn}
                      onEdit={handleEditConnection}
                      onDelete={handleDeleteConnection}
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

export default memo(DayColumn);
