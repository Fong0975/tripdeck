import type { UniqueIdentifier } from '@dnd-kit/core';

/** Minimal day shape needed to resolve a drop target. */
interface DayWithAttractionIds {
  attractions: ReadonlyArray<{ id: number }>;
}

/** Where a dragged attraction came from and where it was dropped. */
export interface DropTarget {
  /** Index into `days` of the day the dragged attraction currently sits in. */
  sourceDayIndex: number;
  /** Position of the dragged attraction within its source day. */
  sourceIndex: number;
  /** Index into `days` of the day it was dropped on. */
  targetDayIndex: number;
  /**
   * Position, within the target day, of the attraction it was dropped over,
   * or null when it was dropped on the day column itself.
   */
  overIndex: number | null;
}

const DAY_DROPPABLE_ID = /^day-(\d+)$/;

/** Finds the day index and in-day position of an attraction id. */
function locateAttraction(
  days: readonly DayWithAttractionIds[],
  attractionId: UniqueIdentifier,
): { dayIndex: number; index: number } | null {
  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    const index = days[dayIndex].attractions.findIndex(
      a => a.id === attractionId,
    );
    if (index !== -1) {
      return { dayIndex, index };
    }
  }
  return null;
}

/**
 * Resolves a drag-end event's active/over ids into source and target
 * positions. Day columns are droppables with ids `day-<dayIndex>`; attraction
 * cards are droppables keyed by their attraction id.
 *
 * @param days - Trip days in display order.
 * @param activeId - Id of the dragged attraction.
 * @param overId - Id of the droppable it was released over.
 * @returns The resolved positions, or null when either end cannot be found.
 */
export function resolveDropTarget(
  days: readonly DayWithAttractionIds[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
): DropTarget | null {
  const source = locateAttraction(days, activeId);
  if (!source) {
    return null;
  }

  const dayMatch =
    typeof overId === 'string' ? DAY_DROPPABLE_ID.exec(overId) : null;
  if (dayMatch) {
    const targetDayIndex = parseInt(dayMatch[1], 10);
    if (targetDayIndex >= days.length) {
      return null;
    }
    return {
      sourceDayIndex: source.dayIndex,
      sourceIndex: source.index,
      targetDayIndex,
      overIndex: null,
    };
  }

  const over = locateAttraction(days, overId);
  if (!over) {
    return null;
  }
  return {
    sourceDayIndex: source.dayIndex,
    sourceIndex: source.index,
    targetDayIndex: over.dayIndex,
    overIndex: over.index,
  };
}

/**
 * Index at which a cross-day drop inserts the attraction into the target
 * day: before the card it was dropped over, or at the end when dropped on the
 * day column.
 */
export function crossDayInsertIndex(
  target: DropTarget,
  targetDayLength: number,
): number {
  return target.overIndex ?? targetDayLength;
}
