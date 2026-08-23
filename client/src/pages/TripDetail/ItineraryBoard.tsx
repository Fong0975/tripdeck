import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';

import AttractionCard from '@/components/AttractionCard';
import DayColumn from '@/components/DayColumn';
import type { Attraction, DayPlan, TravelConnection } from '@/types';

interface Props {
  days: DayPlan[];
  sensors: Parameters<typeof DndContext>[0]['sensors'];
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  activeAttractionId: number | null;
  getActiveAttraction: () => Attraction | undefined;
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
        {activeAttractionId && getActiveAttraction() && (
          <div className='rotate-2 opacity-90 shadow-xl'>
            <AttractionCard
              attraction={getActiveAttraction()!}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
