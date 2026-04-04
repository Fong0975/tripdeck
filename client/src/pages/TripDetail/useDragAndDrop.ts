import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useState } from 'react';

import type { Attraction, TripContent } from '@/types';
import {
  addAttraction,
  deleteAttraction,
  reorderAttractions,
} from '@/utils/storage';

export function useDragAndDrop(
  tripId: number | null,
  content: TripContent | null,
  onReload: () => Promise<void>,
) {
  const [activeAttractionId, setActiveAttractionId] = useState<number | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const findDayIndexByAttractionId = (attractionId: number): number => {
    if (!content) {
      return -1;
    }
    return content.days.findIndex(d =>
      d.attractions.some(a => a.id === attractionId),
    );
  };

  const findDayIndexByDroppableId = (droppableId: string): number => {
    const match = droppableId.match(/^day-(\d+)$/);
    return match ? parseInt(match[1], 10) : -1;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveAttractionId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveAttractionId(null);
    const { active, over } = event;
    if (!over || !content || !tripId) {
      return;
    }

    const activeId = active.id as number;
    const overId = over.id;

    const sourceDayIdx = findDayIndexByAttractionId(activeId);
    if (sourceDayIdx === -1) {
      return;
    }

    const targetDayIdx =
      typeof overId === 'string' && overId.startsWith('day-')
        ? findDayIndexByDroppableId(overId)
        : findDayIndexByAttractionId(overId as number);

    if (targetDayIdx === -1) {
      return;
    }

    if (sourceDayIdx === targetDayIdx) {
      const day = content.days[sourceDayIdx];
      const oldIdx = day.attractions.findIndex(a => a.id === activeId);
      const newIdx = day.attractions.findIndex(a => a.id === overId);
      if (oldIdx === newIdx || newIdx === -1) {
        return;
      }

      const orderedIds = arrayMove(day.attractions, oldIdx, newIdx).map(
        a => a.id,
      );
      void reorderAttractions(tripId, day.id, orderedIds).then(() =>
        onReload(),
      );
    } else {
      const attraction = content.days[sourceDayIdx].attractions.find(
        a => a.id === activeId,
      );
      if (!attraction) {
        return;
      }

      const targetDay = content.days[targetDayIdx];
      void deleteAttraction(tripId, activeId)
        .then(() =>
          addAttraction(tripId, targetDay.id, {
            name: attraction.name,
            googleMapUrl: attraction.googleMapUrl ?? undefined,
            notes: attraction.notes ?? undefined,
            nearbyAttractions: attraction.nearbyAttractions ?? undefined,
            referenceWebsites: attraction.referenceWebsites,
          }),
        )
        .then(() => onReload());
    }
  };

  const getActiveAttraction = (): Attraction | undefined => {
    if (!activeAttractionId || !content) {
      return undefined;
    }
    for (const day of content.days) {
      const found = day.attractions.find(a => a.id === activeAttractionId);
      if (found) {
        return found;
      }
    }
    return undefined;
  };

  return {
    sensors,
    activeAttractionId,
    handleDragStart,
    handleDragEnd,
    getActiveAttraction,
  };
}
