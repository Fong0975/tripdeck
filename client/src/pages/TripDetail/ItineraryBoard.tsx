import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMemo } from 'react';

import AttractionCard from '@/components/AttractionCard';
import DayColumn from '@/components/DayColumn';
import type { Attraction, DayPlan, TravelConnection } from '@/types';

const noop = () => {};

/** Per-day board callbacks forwarded to every `DayColumn`. */
export interface BoardCallbacks {
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

interface Props extends BoardCallbacks {
  days: DayPlan[];
  sensors: Parameters<typeof DndContext>[0]['sensors'];
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  activeAttractionId: number | null;
  getActiveAttraction: () => Attraction | undefined;
}

/**
 * Renders the drag-and-drop itinerary board: one sortable day column per
 * trip day, plus the drag overlay preview shown while an attraction is
 * being dragged.
 */
export default function ItineraryBoard({
  days,
  sensors,
  onDragStart,
  onDragEnd,
  activeAttractionId,
  getActiveAttraction,
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
  const activeAttraction = useMemo(
    () => (activeAttractionId ? getActiveAttraction() : undefined),
    [activeAttractionId, getActiveAttraction],
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className='flex min-w-max gap-4 pb-4'>
        {days.map((day, i) => (
          <DayColumn
            key={day.id}
            day={day}
            dayIndex={i}
            onEditDayNote={onEditDayNote}
            onOpenDayMap={onOpenDayMap}
            onAddAttraction={onAddAttraction}
            onEditAttraction={onEditAttraction}
            onDeleteAttraction={onDeleteAttraction}
            onDuplicateAttraction={onDuplicateAttraction}
            onEditConnection={onEditConnection}
            onDeleteConnection={onDeleteConnection}
            onAddConnection={onAddConnection}
            onAddLocation={onAddLocation}
            onUpdateLocation={onUpdateLocation}
            onDeleteLocation={onDeleteLocation}
          />
        ))}
      </div>

      <DragOverlay>
        {activeAttraction && (
          <div className='rotate-2 opacity-90 shadow-xl'>
            <AttractionCard
              attraction={activeAttraction}
              onEdit={noop}
              onDelete={noop}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
