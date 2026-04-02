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

type ContentUpdater = (updater: (prev: TripContent) => TripContent) => void;

export function useDragAndDrop(
  content: TripContent | null,
  updateContent: ContentUpdater,
) {
  const [activeAttractionId, setActiveAttractionId] = useState<string | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const findDayIndexByAttractionId = (attractionId: string): number => {
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
    setActiveAttractionId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveAttractionId(null);
    const { active, over } = event;
    if (!over || !content) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceDayIdx = findDayIndexByAttractionId(activeId);
    if (sourceDayIdx === -1) {
      return;
    }

    const targetDayIdx = overId.startsWith('day-')
      ? findDayIndexByDroppableId(overId)
      : findDayIndexByAttractionId(overId);

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

      updateContent(prev => ({
        ...prev,
        days: prev.days.map((d, i) =>
          i === sourceDayIdx
            ? { ...d, attractions: arrayMove(d.attractions, oldIdx, newIdx) }
            : d,
        ),
      }));
    } else {
      const attraction = content.days[sourceDayIdx].attractions.find(
        a => a.id === activeId,
      );
      if (!attraction) {
        return;
      }

      updateContent(prev => ({
        ...prev,
        days: prev.days.map((day, i) => {
          if (i === sourceDayIdx) {
            return {
              ...day,
              attractions: day.attractions.filter(a => a.id !== activeId),
              connections: day.connections.filter(
                c =>
                  c.fromAttractionId !== activeId &&
                  c.toAttractionId !== activeId,
              ),
            };
          }
          if (i === targetDayIdx) {
            return { ...day, attractions: [...day.attractions, attraction] };
          }
          return day;
        }),
      }));
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
