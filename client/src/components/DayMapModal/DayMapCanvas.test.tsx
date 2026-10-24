import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MapsQuotaError } from '@/api/maps';
import { subscribeMapsAuthFailure } from '@/utils/googleMaps/loader';
import type { MapPoint } from '@/utils/googleMaps/mapPoints';
import {
  attachMapSession,
  detachMapSession,
  type MapSession,
} from '@/utils/googleMaps/mapSession';
import { applyMarkers } from '@/utils/googleMaps/markers';
import { applyRoute } from '@/utils/googleMaps/route';

import DayMapCanvas from './DayMapCanvas';

vi.mock('@/utils/googleMaps/loader', () => ({
  subscribeMapsAuthFailure: vi.fn(),
}));
vi.mock('@/utils/googleMaps/mapSession', () => ({
  attachMapSession: vi.fn(),
  detachMapSession: vi.fn(),
}));
vi.mock('@/utils/googleMaps/markers', () => ({ applyMarkers: vi.fn() }));
vi.mock('@/utils/googleMaps/route', () => ({ applyRoute: vi.fn() }));

const SESSION = { id: 'session' } as unknown as MapSession;
const POINTS: MapPoint[] = [
  { attractionId: 1, dayId: 1, order: 1, name: 'A', lat: 1, lng: 2 },
];

const unsubscribe = vi.fn();
let authFailureListener: () => void = () => {};

beforeEach(() => {
  vi.mocked(attachMapSession).mockResolvedValue(SESSION);
  vi.mocked(subscribeMapsAuthFailure).mockImplementation(listener => {
    authFailureListener = listener;
    return unsubscribe;
  });
});

async function renderReady(points = POINTS, activeDayId = 1) {
  const view = render(
    <DayMapCanvas points={points} activeDayId={activeDayId} />,
  );
  await waitFor(() => expect(applyMarkers).toHaveBeenCalled());
  return view;
}

describe('DayMapCanvas', () => {
  it('shows a loading status until the map is attached, then draws the markers', async () => {
    let resolveAttach: (session: MapSession) => void = () => {};
    vi.mocked(attachMapSession).mockReturnValue(
      new Promise(resolve => {
        resolveAttach = resolve;
      }),
    );
    render(<DayMapCanvas points={POINTS} activeDayId={1} />);

    expect(screen.getByRole('status')).toHaveTextContent('地圖載入中…');
    expect(applyMarkers).not.toHaveBeenCalled();

    await act(async () => resolveAttach(SESSION));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(applyMarkers).toHaveBeenCalledWith(SESSION, POINTS, 1);
    expect(applyRoute).toHaveBeenCalledWith(SESSION, POINTS, 1);
    expect(attachMapSession).toHaveBeenCalledWith(expect.any(HTMLElement));
  });

  it('redraws when the points or the selected day change', async () => {
    const { rerender } = await renderReady();
    const morePoints = [...POINTS, { ...POINTS[0], attractionId: 2 }];

    rerender(<DayMapCanvas points={morePoints} activeDayId={1} />);
    expect(applyMarkers).toHaveBeenLastCalledWith(SESSION, morePoints, 1);

    rerender(<DayMapCanvas points={morePoints} activeDayId={2} />);
    expect(applyMarkers).toHaveBeenLastCalledWith(SESSION, morePoints, 2);
    expect(applyRoute).toHaveBeenLastCalledWith(SESSION, morePoints, 2);
  });

  it.each([
    {
      description: 'the daily quota is used up',
      error: new MapsQuotaError(null),
      message: '今日地圖額度已用完，請明天再試',
    },
    {
      description: 'loading fails for another reason',
      error: new Error('offline'),
      message: '地圖載入失敗，請稍後再試',
    },
  ])('shows an alert when $description', async ({ error, message }) => {
    vi.mocked(attachMapSession).mockRejectedValue(error);

    render(<DayMapCanvas points={POINTS} activeDayId={1} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(applyMarkers).not.toHaveBeenCalled();
  });

  it('replaces the map with an alert when Google rejects the key after loading', async () => {
    await renderReady();

    act(() => authFailureListener());

    expect(screen.getByRole('alert')).toHaveTextContent(
      '地圖金鑰無效或額度已用完，暫時無法顯示地圖',
    );
  });

  it('detaches the map and stops listening when it unmounts', async () => {
    const { unmount } = await renderReady();

    unmount();

    expect(detachMapSession).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      description: 'attaching finishes',
      settle: (p: { resolve: (s: MapSession) => void }) => p.resolve(SESSION),
    },
    {
      description: 'attaching fails',
      settle: (p: { reject: (e: unknown) => void }) =>
        p.reject(new Error('late')),
    },
  ])(
    'ignores the outcome if $description after unmount',
    async ({ settle }) => {
      const pending: {
        resolve: (s: MapSession) => void;
        reject: (e: unknown) => void;
      } = { resolve: () => {}, reject: () => {} };
      vi.mocked(attachMapSession).mockReturnValue(
        new Promise((resolve, reject) => {
          pending.resolve = resolve;
          pending.reject = reject;
        }),
      );
      const { unmount } = render(
        <DayMapCanvas points={POINTS} activeDayId={1} />,
      );

      unmount();
      settle(pending);
      await Promise.resolve();

      expect(applyMarkers).not.toHaveBeenCalled();
    },
  );

  it('ignores an auth failure reported after unmount', async () => {
    const { unmount } = await renderReady();
    unmount();

    expect(() => act(() => authFailureListener())).not.toThrow();
  });
});
