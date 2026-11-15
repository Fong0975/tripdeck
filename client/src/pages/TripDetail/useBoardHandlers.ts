import { useLayoutEffect, useMemo, useRef } from 'react';

import type { Attraction } from '@/types';

import type { BoardCallbacks } from './ItineraryBoard';
import type { ModalState } from './types';

/** Mutation handlers the board callbacks dispatch to. */
export interface BoardActions {
  deleteAttraction: (attractionId: number) => Promise<void>;
  duplicateAttraction: (attraction: Attraction) => Promise<void>;
  addConnection: (dayIndex: number, fromId: number, toId: number) => void;
  deleteConnection: (connectionId: number) => Promise<void>;
  addLocation: (dayIndex: number, name: string) => Promise<void>;
  updateLocation: (locationId: number, name: string) => Promise<void>;
  deleteLocation: (locationId: number) => Promise<void>;
}

/**
 * Builds the itinerary board's per-day callbacks: edit/open callbacks switch
 * the page modal, the rest fire the matching mutation without awaiting it.
 *
 * The returned object and its callbacks keep the same identity across
 * renders. The action handlers are recreated every render, so they are read
 * from a ref at call time instead of being memo dependencies.
 *
 * @param openModal - Sets the page's modal state; must be stable.
 * @param actions - The latest mutation handlers.
 * @returns Callbacks matching the `ItineraryBoard` props.
 */
export function useBoardHandlers(
  openModal: (modal: ModalState) => void,
  actions: BoardActions,
): BoardCallbacks {
  const actionsRef = useRef(actions);
  useLayoutEffect(() => {
    actionsRef.current = actions;
  });

  return useMemo<BoardCallbacks>(
    () => ({
      onEditDayNote: dayIndex => openModal({ type: 'editDayNote', dayIndex }),
      onOpenDayMap: dayIndex => openModal({ type: 'dayMap', dayIndex }),
      onAddAttraction: dayIndex =>
        openModal({ type: 'addAttraction', dayIndex }),
      onEditAttraction: (dayIndex, attraction) =>
        openModal({ type: 'editAttraction', dayIndex, attraction }),
      onDeleteAttraction: (_dayIndex, attractionId) =>
        void actionsRef.current.deleteAttraction(attractionId),
      onDuplicateAttraction: (_dayIndex, attraction) =>
        void actionsRef.current.duplicateAttraction(attraction),
      onEditConnection: (dayIndex, connection) =>
        openModal({ type: 'editConnection', dayIndex, connection }),
      onDeleteConnection: (_dayIndex, connectionId) =>
        void actionsRef.current.deleteConnection(connectionId),
      onAddConnection: (dayIndex, fromId, toId) =>
        actionsRef.current.addConnection(dayIndex, fromId, toId),
      onAddLocation: (dayIndex, name) =>
        void actionsRef.current.addLocation(dayIndex, name),
      onUpdateLocation: (_dayIndex, locationId, name) =>
        void actionsRef.current.updateLocation(locationId, name),
      onDeleteLocation: (_dayIndex, locationId) =>
        void actionsRef.current.deleteLocation(locationId),
    }),
    [openModal],
  );
}
