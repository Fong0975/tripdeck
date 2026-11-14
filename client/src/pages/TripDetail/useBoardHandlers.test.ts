import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeAttraction, makeConnection } from '@/test-utils/fixtures';

import type { BoardCallbacks } from './ItineraryBoard';
import { useBoardHandlers, type BoardActions } from './useBoardHandlers';

const attraction = makeAttraction({ id: 10 });
const connection = makeConnection({ id: 100 });

function makeActions(): BoardActions {
  return {
    deleteAttraction: vi.fn(() => Promise.resolve()),
    duplicateAttraction: vi.fn(() => Promise.resolve()),
    addConnection: vi.fn(),
    deleteConnection: vi.fn(() => Promise.resolve()),
    addLocation: vi.fn(() => Promise.resolve()),
    updateLocation: vi.fn(() => Promise.resolve()),
    deleteLocation: vi.fn(() => Promise.resolve()),
  };
}

type Call = (handlers: BoardCallbacks) => void;

describe('useBoardHandlers', () => {
  it.each<{ name: string; call: Call; modal: unknown }>([
    {
      name: 'onEditDayNote',
      call: h => h.onEditDayNote(1),
      modal: { type: 'editDayNote', dayIndex: 1 },
    },
    {
      name: 'onOpenDayMap',
      call: h => h.onOpenDayMap(1),
      modal: { type: 'dayMap', dayIndex: 1 },
    },
    {
      name: 'onAddAttraction',
      call: h => h.onAddAttraction(1),
      modal: { type: 'addAttraction', dayIndex: 1 },
    },
    {
      name: 'onEditAttraction',
      call: h => h.onEditAttraction(1, attraction),
      modal: { type: 'editAttraction', dayIndex: 1, attraction },
    },
    {
      name: 'onEditConnection',
      call: h => h.onEditConnection(1, connection),
      modal: { type: 'editConnection', dayIndex: 1, connection },
    },
  ])('$name opens the matching modal', ({ call, modal }) => {
    const openModal = vi.fn();
    const actions = makeActions();
    const { result } = renderHook(() => useBoardHandlers(openModal, actions));

    call(result.current);

    expect(openModal).toHaveBeenCalledWith(modal);
    Object.values(actions).forEach(action =>
      expect(action).not.toHaveBeenCalled(),
    );
  });

  it.each<{
    name: string;
    call: Call;
    action: keyof BoardActions;
    args: unknown[];
  }>([
    {
      name: 'onDeleteAttraction',
      call: h => h.onDeleteAttraction(1, 10),
      action: 'deleteAttraction',
      args: [10],
    },
    {
      name: 'onDuplicateAttraction',
      call: h => h.onDuplicateAttraction(1, attraction),
      action: 'duplicateAttraction',
      args: [attraction],
    },
    {
      name: 'onDeleteConnection',
      call: h => h.onDeleteConnection(1, 100),
      action: 'deleteConnection',
      args: [100],
    },
    {
      name: 'onAddConnection',
      call: h => h.onAddConnection(1, 10, 11),
      action: 'addConnection',
      args: [1, 10, 11],
    },
    {
      name: 'onAddLocation',
      call: h => h.onAddLocation(1, 'Airport'),
      action: 'addLocation',
      args: [1, 'Airport'],
    },
    {
      name: 'onUpdateLocation',
      call: h => h.onUpdateLocation(1, 50, 'Renamed'),
      action: 'updateLocation',
      args: [50, 'Renamed'],
    },
    {
      name: 'onDeleteLocation',
      call: h => h.onDeleteLocation(1, 50),
      action: 'deleteLocation',
      args: [50],
    },
  ])(
    '$name dispatches to $action with the right args',
    ({ call, action, args }) => {
      const openModal = vi.fn();
      const actions = makeActions();
      const { result } = renderHook(() => useBoardHandlers(openModal, actions));

      call(result.current);

      expect(actions[action]).toHaveBeenCalledWith(...args);
      expect(openModal).not.toHaveBeenCalled();
    },
  );

  it('keeps the same callbacks across renders while dispatching to the latest actions', () => {
    const openModal = vi.fn();
    const first = makeActions();
    const second = makeActions();
    const { result, rerender } = renderHook(
      ({ actions }) => useBoardHandlers(openModal, actions),
      { initialProps: { actions: first } },
    );
    const initial = result.current;

    rerender({ actions: second });
    result.current.onDeleteAttraction(0, 10);

    expect(result.current).toBe(initial);
    expect(first.deleteAttraction).not.toHaveBeenCalled();
    expect(second.deleteAttraction).toHaveBeenCalledWith(10);
  });
});
