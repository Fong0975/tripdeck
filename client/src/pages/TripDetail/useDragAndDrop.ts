import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useState } from 'react';

import { showToast } from '@/lib/toast';
import type { Attraction, TripContent } from '@/types';
import { findConnectionsBrokenByMove } from '@/utils/connectionAdjacency';
import { moveAttraction, reorderAttractions } from '@/utils/storage';

import { crossDayInsertIndex, resolveDropTarget } from './dragTarget';

type PendingMove =
  | { type: 'sameDay'; dayId: number; orderedIds: number[] }
  | {
      type: 'crossDay';
      attractionId: number;
      targetDayId: number;
      targetIndex: number;
    };

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveAttractionId(event.active.id as number);
  };

  const performSameDayReorder = (dayId: number, orderedIds: number[]) => {
    /* v8 ignore next 3 -- defensive guard; tripId is always set once a drag is possible */
    if (!tripId) {
      return;
    }
    void reorderAttractions(tripId, dayId, orderedIds)
      .then(() => onReload())
      .catch(() => showToast('error', '調整景點順序失敗，請稍後再試'));
  };

  const performCrossDayMove = (
    attractionId: number,
    targetDayId: number,
    targetIndex: number,
  ) => {
    /* v8 ignore next 3 -- defensive guard; tripId is always set once a drag is possible */
    if (!tripId) {
      return;
    }
    // Reload on failure too: the server may have rejected a move based on
    // stale client state (e.g. the day was deleted elsewhere).
    void moveAttraction(tripId, attractionId, targetDayId, targetIndex)
      .catch(() => showToast('error', '移動景點失敗，請稍後再試'))
      .then(() => onReload());
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveAttractionId(null);
    const { active, over } = event;
    if (!over || !content || !tripId) {
      return;
    }

    const activeId = active.id as number;
    const target = resolveDropTarget(content.days, activeId, over.id);
    if (!target) {
      return;
    }

    if (target.sourceDayIndex === target.targetDayIndex) {
      const day = content.days[target.sourceDayIndex];
      const { sourceIndex, overIndex } = target;
      if (overIndex === null || overIndex === sourceIndex) {
        return;
      }

      const orderedIds = arrayMove(day.attractions, sourceIndex, overIndex).map(
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
      const sourceDay = content.days[target.sourceDayIndex];
      const targetDay = content.days[target.targetDayIndex];
      const targetIndex = crossDayInsertIndex(
        target,
        targetDay.attractions.length,
      );

      const sourceIds = sourceDay.attractions.map(a => a.id);
      const targetIds = targetDay.attractions.map(a => a.id);
      const broken = [
        ...findConnectionsBrokenByMove(
          sourceDay.connections,
          sourceIds,
          sourceIds.filter(id => id !== activeId),
        ),
        ...findConnectionsBrokenByMove(targetDay.connections, targetIds, [
          ...targetIds.slice(0, targetIndex),
          activeId,
          ...targetIds.slice(targetIndex),
        ]),
      ];
      if (broken.length > 0) {
        setPendingMove({
          type: 'crossDay',
          attractionId: activeId,
          targetDayId: targetDay.id,
          targetIndex,
        });
        return;
      }

      performCrossDayMove(activeId, targetDay.id, targetIndex);
    }
  };

  const confirmMove = () => {
    if (!pendingMove) {
      return;
    }
    if (pendingMove.type === 'sameDay') {
      performSameDayReorder(pendingMove.dayId, pendingMove.orderedIds);
    } else {
      performCrossDayMove(
        pendingMove.attractionId,
        pendingMove.targetDayId,
        pendingMove.targetIndex,
      );
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
