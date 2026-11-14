import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { showToast } from '@/lib/toast';
import {
  makeAttraction,
  makeConnection,
  makeContent,
  makeDay,
  makeImage,
} from '@/test-utils/fixtures';

import { imageCountOf, useDateShrinkImpact } from './useDateShrinkImpact';

vi.mock('@/lib/toast');

describe('imageCountOf', () => {
  it('sums images across attractions, connections, and the day itself', () => {
    const day = makeDay({
      attractions: [
        makeAttraction({
          id: 1,
          name: 'A',
          images: [makeImage({ id: 1, filename: 'a.jpg' })],
        }),
        makeAttraction({
          id: 2,
          name: 'B',
          images: [makeImage({ id: 2, filename: 'b.jpg' })],
        }),
      ],
      connections: [
        makeConnection({ images: [makeImage({ id: 3, filename: 'c.jpg' })] }),
      ],
      images: [makeImage({ id: 4, filename: 'd.jpg' })],
    });

    expect(imageCountOf(day)).toBe(4);
  });

  it('treats missing images arrays as 0', () => {
    const day = makeDay({
      attractions: [makeAttraction({ id: 1, name: 'A' })],
      connections: [makeConnection()],
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

  it.each([
    {
      description: 'content resolves to null',
      getContent: () => vi.fn().mockResolvedValue(null),
    },
    {
      description: 'fetching content rejects',
      getContent: () =>
        vi.fn().mockRejectedValue(new Error('API error 500: /content')),
    },
  ])(
    'returns false and shows an error toast when $description',
    async ({ getContent }) => {
      const { result } = renderHook(() =>
        useDateShrinkImpact({
          tripStartDate: '2026-01-05',
          tripEndDate: '2026-01-10',
          getContent: getContent(),
        }),
      );

      let canProceed = true;
      await act(async () => {
        canProceed = await result.current.checkImpact(
          '2026-01-06',
          '2026-01-08',
        );
      });

      expect(canProceed).toBe(false);
      expect(result.current.pendingImpact).toBeNull();
      expect(showToast).toHaveBeenCalledWith(
        'error',
        '無法確認日期變更的影響，請稍後再試',
      );
    },
  );

  it('returns true and does not set pendingImpact when no days fall outside the new range', async () => {
    const days = [makeDay({ id: 1, date: '2026-01-06' })];
    const getContent = vi.fn().mockResolvedValue(makeContent(days));
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
    const insideDay = makeDay({ id: 1, date: '2026-01-06' });
    const outsideDay = makeDay({ id: 2, date: '2026-01-09' });
    const getContent = vi
      .fn()
      .mockResolvedValue(makeContent([insideDay, outsideDay]));
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
    const outsideDay = makeDay({ id: 2, date: '2026-01-09' });
    const getContent = vi.fn().mockResolvedValue(makeContent([outsideDay]));
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
