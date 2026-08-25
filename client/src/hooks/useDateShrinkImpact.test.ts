import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DayPlan, TripContent } from '@/types';

import { imageCountOf, useDateShrinkImpact } from './useDateShrinkImpact';

function dayPlan(overrides: Partial<DayPlan> = {}): DayPlan {
  return {
    id: 1,
    day: 1,
    date: '2026-01-01',
    locations: [],
    attractions: [],
    connections: [],
    ...overrides,
  };
}

function content(days: DayPlan[]): TripContent {
  return { tripId: 1, days };
}

describe('imageCountOf', () => {
  it('sums images across attractions, connections, and the day itself', () => {
    const day = dayPlan({
      attractions: [
        { id: 1, name: 'A', images: [{ id: 1, filename: 'a.jpg', title: '' }] },
        { id: 2, name: 'B', images: [{ id: 2, filename: 'b.jpg', title: '' }] },
      ],
      connections: [
        {
          id: 1,
          fromAttractionId: 1,
          toAttractionId: 2,
          transportMode: 'walk',
          images: [{ id: 3, filename: 'c.jpg', title: '' }],
        },
      ],
      images: [{ id: 4, filename: 'd.jpg', title: '' }],
    });

    expect(imageCountOf(day)).toBe(4);
  });

  it('treats missing images arrays as 0', () => {
    const day = dayPlan({
      attractions: [{ id: 1, name: 'A' }],
      connections: [
        {
          id: 1,
          fromAttractionId: 1,
          toAttractionId: 2,
          transportMode: 'walk',
        },
      ],
    });

    expect(imageCountOf(day)).toBe(0);
  });
});

describe('useDateShrinkImpact', () => {
  it('returns true without fetching content when the range is a pure expansion', async () => {
    const getContent = vi.fn();
    const { result } = renderHook(() =>
      useDateShrinkImpact({
        tripStartDate: '2026-01-05',
        tripEndDate: '2026-01-10',
        getContent,
      }),
    );

    let canProceed = false;
    await act(async () => {
      canProceed = await result.current.checkImpact('2026-01-01', '2026-01-15');
    });

    expect(canProceed).toBe(true);
    expect(getContent).not.toHaveBeenCalled();
    expect(result.current.pendingImpact).toBeNull();
  });

  it('returns true when content is unavailable', async () => {
    const getContent = vi.fn().mockResolvedValue(null);
    const { result } = renderHook(() =>
      useDateShrinkImpact({
        tripStartDate: '2026-01-05',
        tripEndDate: '2026-01-10',
        getContent,
      }),
    );

    let canProceed = false;
    await act(async () => {
      canProceed = await result.current.checkImpact('2026-01-06', '2026-01-08');
    });

    expect(canProceed).toBe(true);
    expect(result.current.pendingImpact).toBeNull();
  });

  it('returns true and does not set pendingImpact when no days fall outside the new range', async () => {
    const days = [dayPlan({ id: 1, date: '2026-01-06' })];
    const getContent = vi.fn().mockResolvedValue(content(days));
    const { result } = renderHook(() =>
      useDateShrinkImpact({
        tripStartDate: '2026-01-05',
        tripEndDate: '2026-01-10',
        getContent,
      }),
    );

    let canProceed = false;
    await act(async () => {
      canProceed = await result.current.checkImpact('2026-01-05', '2026-01-08');
    });

    expect(canProceed).toBe(true);
    expect(result.current.pendingImpact).toBeNull();
  });

  it('returns false and records the impacted days when some days fall outside the new range', async () => {
    const insideDay = dayPlan({ id: 1, date: '2026-01-06' });
    const outsideDay = dayPlan({ id: 2, date: '2026-01-09' });
    const getContent = vi
      .fn()
      .mockResolvedValue(content([insideDay, outsideDay]));
    const { result } = renderHook(() =>
      useDateShrinkImpact({
        tripStartDate: '2026-01-05',
        tripEndDate: '2026-01-10',
        getContent,
      }),
    );

    let canProceed = true;
    await act(async () => {
      canProceed = await result.current.checkImpact('2026-01-05', '2026-01-07');
    });

    expect(canProceed).toBe(false);
    expect(result.current.pendingImpact).toEqual([outsideDay]);
  });

  it('clears pendingImpact via dismissImpact', async () => {
    const outsideDay = dayPlan({ id: 2, date: '2026-01-09' });
    const getContent = vi.fn().mockResolvedValue(content([outsideDay]));
    const { result } = renderHook(() =>
      useDateShrinkImpact({
        tripStartDate: '2026-01-05',
        tripEndDate: '2026-01-10',
        getContent,
      }),
    );

    await act(async () => {
      await result.current.checkImpact('2026-01-05', '2026-01-07');
    });
    expect(result.current.pendingImpact).not.toBeNull();

    act(() => result.current.dismissImpact());

    expect(result.current.pendingImpact).toBeNull();
  });
});
