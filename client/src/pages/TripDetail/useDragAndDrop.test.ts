import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TripContent } from '@/types';
import {
  addAttraction,
  deleteAttraction,
  reorderAttractions,
} from '@/utils/storage';

import { useDragAndDrop } from './useDragAndDrop';

vi.mock('@/utils/storage', () => ({
  addAttraction: vi.fn().mockResolvedValue({ id: 999, name: 'New' }),
  deleteAttraction: vi.fn().mockResolvedValue(undefined),
  reorderAttractions: vi.fn().mockResolvedValue(undefined),
}));

function makeContent(): TripContent {
  return {
    tripId: 1,
    days: [
      {
        id: 10,
        day: 1,
        date: '2026-01-01',
        locations: [],
        attractions: [
          { id: 100, name: 'A' },
          { id: 101, name: 'B' },
        ],
        connections: [],
      },
      {
        id: 20,
        day: 2,
        date: '2026-01-02',
        locations: [],
        attractions: [{ id: 200, name: 'C' }],
        connections: [],
      },
    ],
  };
}

function makeDragEndEvent(
  activeId: number,
  overId: number | string | null,
): DragEndEvent {
  return {
    active: { id: activeId },
    over: overId === null ? null : { id: overId },
  } as unknown as DragEndEvent;
}

// `handleDragEnd` is exercised directly with hand-built events instead of
// simulated pointer gestures — dnd-kit relies on DOM measurement APIs
// (getBoundingClientRect) that jsdom cannot compute, so a real drag would not
// be representative. See the plan's "明確排除範圍".
describe('useDragAndDrop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleDragEnd', () => {
    it.each([
      {
        description: 'there is no drop target',
        tripId: 1,
        hasContent: true,
        activeId: 100,
        overId: null,
      },
      {
        description: 'tripId is missing',
        tripId: null,
        hasContent: true,
        activeId: 100,
        overId: 101,
      },
      {
        description: 'content has not loaded yet',
        tripId: 1,
        hasContent: false,
        activeId: 100,
        overId: 101,
      },
      {
        description: 'the active attraction is not found in any day',
        tripId: 1,
        hasContent: true,
        activeId: 9999,
        overId: 101,
      },
      {
        description: 'the drop target is not a day or attraction id',
        tripId: 1,
        hasContent: true,
        activeId: 100,
        overId: 9999,
      },
      {
        description: 'dropped on itself (no positional change)',
        tripId: 1,
        hasContent: true,
        activeId: 100,
        overId: 100,
      },
      {
        description: "dropped onto its own day's droppable background",
        tripId: 1,
        hasContent: true,
        activeId: 100,
        overId: 'day-0',
      },
    ])(
      'does nothing when $description',
      async ({ tripId, hasContent, activeId, overId }) => {
        const onReload = vi.fn();
        const content = hasContent ? makeContent() : null;
        const { result } = renderHook(() =>
          useDragAndDrop(tripId, content, onReload),
        );

        await act(async () => {
          result.current.handleDragEnd(makeDragEndEvent(activeId, overId));
          await Promise.resolve();
        });

        expect(reorderAttractions).not.toHaveBeenCalled();
        expect(deleteAttraction).not.toHaveBeenCalled();
        expect(addAttraction).not.toHaveBeenCalled();
        expect(onReload).not.toHaveBeenCalled();
      },
    );

    it('reorders attractions within the same day and reloads', async () => {
      const onReload = vi.fn();
      const { result } = renderHook(() =>
        useDragAndDrop(1, makeContent(), onReload),
      );

      act(() => {
        result.current.handleDragEnd(makeDragEndEvent(100, 101));
      });

      await vi.waitFor(() => {
        expect(onReload).toHaveBeenCalled();
      });
      expect(reorderAttractions).toHaveBeenCalledWith(1, 10, [101, 100]);
    });

    it('moves an attraction to a different day and reloads', async () => {
      const onReload = vi.fn();
      const { result } = renderHook(() =>
        useDragAndDrop(1, makeContent(), onReload),
      );

      act(() => {
        result.current.handleDragEnd(makeDragEndEvent(100, 200));
      });

      await vi.waitFor(() => {
        expect(onReload).toHaveBeenCalled();
      });
      expect(deleteAttraction).toHaveBeenCalledWith(1, 100);
      expect(addAttraction).toHaveBeenCalledWith(1, 20, {
        name: 'A',
        googleMapUrl: undefined,
        notes: undefined,
        nearbyAttractions: undefined,
        referenceWebsites: undefined,
      });
    });

    it('clears the active attraction id', () => {
      const { result } = renderHook(() =>
        useDragAndDrop(1, makeContent(), vi.fn()),
      );

      act(() => {
        result.current.handleDragStart({
          active: { id: 100 },
        } as unknown as DragStartEvent);
      });
      act(() => {
        result.current.handleDragEnd(makeDragEndEvent(100, null));
      });

      expect(result.current.activeAttractionId).toBeNull();
    });
  });

  it('handleDragStart sets the active attraction id', () => {
    const { result } = renderHook(() =>
      useDragAndDrop(1, makeContent(), vi.fn()),
    );

    act(() => {
      result.current.handleDragStart({
        active: { id: 100 },
      } as unknown as DragStartEvent);
    });

    expect(result.current.activeAttractionId).toBe(100);
  });

  describe('getActiveAttraction', () => {
    it.each([
      {
        description: 'no attraction is currently being dragged',
        setActive: false,
        activeId: undefined,
        expectedName: undefined,
      },
      {
        description: 'the active id is not present in content',
        setActive: true,
        activeId: 9999,
        expectedName: undefined,
      },
      {
        description: 'the active id is present in content',
        setActive: true,
        activeId: 200,
        expectedName: 'C',
      },
    ])(
      'returns the expected result when $description',
      ({ setActive, activeId, expectedName }) => {
        const { result } = renderHook(() =>
          useDragAndDrop(1, makeContent(), vi.fn()),
        );

        if (setActive) {
          act(() => {
            result.current.handleDragStart({
              active: { id: activeId },
            } as unknown as DragStartEvent);
          });
        }

        expect(result.current.getActiveAttraction()?.name).toBe(expectedName);
      },
    );
  });
});
