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
import { findConnectionsBrokenByMove } from '@/utils/connectionAdjacency';
import {
  addAttraction,
  deleteAttraction,
  reorderAttractions,
} from '@/utils/storage';

type PendingMove =
  | { type: 'sameDay'; dayId: number; orderedIds: number[] }
  | { type: 'crossDay'; attraction: Attraction; targetDayId: number };

export function useDragAndDrop(
  tripId: number | null,
  content: TripContent | null,
  onReload: () => Promise<void>,
) {
  const [activeAttractionId, setActiveAttractionId] = useState<number | null>(
    null,
  );
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const findDayIndexByAttractionId = (attractionId: number): number => {
    /* v8 ignore next 3 -- defensive guard; content is always loaded before drag-and-drop is interactive */
    if (!content) {
      return -1;
    }
    return content.days.findIndex(d =>
      d.attractions.some(a => a.id === attractionId),
    );
  };

  const findDayIndexByDroppableId = (droppableId: string): number => {
    const match = droppableId.match(/^day-(\d+)$/);
    /* v8 ignore next -- droppableId is always internally generated as `day-N`; non-matching fallback is defensive */
    return match ? parseInt(match[1], 10) : -1;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveAttractionId(event.active.id as number);
  };

  const performSameDayReorder = (dayId: number, orderedIds: number[]) => {
    /* v8 ignore next 3 -- defensive guard; tripId is always set once a drag is possible */
    if (!tripId) {
      return;
    }
    void reorderAttractions(tripId, dayId, orderedIds).then(() => onReload());
  };

  const performCrossDayMove = (attraction: Attraction, targetDayId: number) => {
    /* v8 ignore next 3 -- defensive guard; tripId is always set once a drag is possible */
    if (!tripId) {
      return;
    }
    void deleteAttraction(tripId, attraction.id)
      .then(() =>
        addAttraction(tripId, targetDayId, {
          name: attraction.name,
          googleMapUrl: attraction.googleMapUrl ?? undefined,
          notes: attraction.notes ?? undefined,
          nearbyAttractions: attraction.nearbyAttractions ?? undefined,
          referenceWebsites: attraction.referenceWebsites,
        }),
      )
      .then(() => onReload());
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
      const broken = findConnectionsBrokenByMove(
        day.connections,
        day.attractions.map(a => a.id),
        orderedIds,
      );
      if (broken.length > 0) {
        setPendingMove({ type: 'sameDay', dayId: day.id, orderedIds });
        return;
      }

      performSameDayReorder(day.id, orderedIds);
    } else {
      const sourceDay = content.days[sourceDayIdx];
      const attraction = sourceDay.attractions.find(a => a.id === activeId);
      /* v8 ignore next 3 -- defensive guard; the attraction was just dragged from this day so it is always found */
      if (!attraction) {
        return;
      }

      const targetDay = content.days[targetDayIdx];
      const remainingIds = sourceDay.attractions
        .filter(a => a.id !== activeId)
        .map(a => a.id);
      const broken = findConnectionsBrokenByMove(
        sourceDay.connections,
        sourceDay.attractions.map(a => a.id),
        remainingIds,
      );
      if (broken.length > 0) {
        setPendingMove({
          type: 'crossDay',
          attraction,
          targetDayId: targetDay.id,
        });
        return;
      }

      performCrossDayMove(attraction, targetDay.id);
    }
  };

  const confirmMove = () => {
    if (!pendingMove) {
      return;
    }
    if (pendingMove.type === 'sameDay') {
      performSameDayReorder(pendingMove.dayId, pendingMove.orderedIds);
    } else {
      performCrossDayMove(pendingMove.attraction, pendingMove.targetDayId);
    }
    setPendingMove(null);
  };

  const cancelMove = () => {
    setPendingMove(null);
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
    showMoveConfirm: pendingMove !== null,
    confirmMove,
    cancelMove,
  };
}
