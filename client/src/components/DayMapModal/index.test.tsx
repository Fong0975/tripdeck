import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTripGeo, type TripGeo } from '@/hooks/useTripGeo';
import { makeAttraction, makeDay } from '@/test-utils/fixtures';
import type { DayPlan } from '@/types';
import type { MapPoint } from '@/utils/googleMaps/mapPoints';

import DayMapModal from './index';

vi.mock('@/hooks/useTripGeo', () => ({ useTripGeo: vi.fn() }));
vi.mock('./DayMapCanvas', () => ({
  default: ({
    points,
    activeDayId,
  }: {
    points: MapPoint[];
    activeDayId: number;
  }) => (
    <div>
      <span>canvas-active-day-{activeDayId}</span>
      <span>canvas-points-{points.map(p => p.attractionId).join(',')}</span>
    </div>
  ),
}));

function makeDays(): DayPlan[] {
  return [
    makeDay({
      id: 1,
      day: 1,
      date: '2026-01-01',
      attractions: [
        makeAttraction({ id: 10, latitude: 1, longitude: 2 }),
        makeAttraction({ id: 11 }),
      ],
    }),
    makeDay({ id: 2, day: 2, date: '2026-01-02' }),
    makeDay({
      id: 3,
      day: 3,
      date: '2026-01-03',
      attractions: [makeAttraction({ id: 30, latitude: 5, longitude: 6 })],
    }),
  ];
}

let geoState: Omit<TripGeo, 'days'>;

beforeEach(() => {
  geoState = { resolving: false, geocodeExhausted: false, failed: false };
  vi.mocked(useTripGeo).mockImplementation((_tripId, days) => ({
    ...geoState,
    days,
  }));
});

function renderModal(initialDayIndex = 0, onClose = vi.fn()) {
  render(
    <DayMapModal
      tripId={7}
      days={makeDays()}
      initialDayIndex={initialDayIndex}
      onClose={onClose}
    />,
  );
  return { onClose };
}

function getSelectedTab() {
  return screen.getByRole('tab', { selected: true });
}

describe('DayMapModal', () => {
  it('renders a tab for every day with its date', () => {
    renderModal();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('第 1 天');
    expect(tabs[0]).toHaveTextContent('1/1');
    expect(tabs[2]).toHaveTextContent('第 3 天');
    expect(tabs[2]).toHaveTextContent('1/3');
  });

  it.each([0, 1, 2])('opens on the day at index %i', initialDayIndex => {
    renderModal(initialDayIndex);

    expect(getSelectedTab()).toHaveTextContent(`第 ${initialDayIndex + 1} 天`);
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      getSelectedTab().id,
    );
    expect(
      screen.getByText(`canvas-active-day-${initialDayIndex + 1}`),
    ).toBeInTheDocument();
  });

  it('switches the map to the clicked day', async () => {
    const user = userEvent.setup();
    renderModal(0);

    await user.click(screen.getByRole('tab', { name: /第 3 天/ }));

    expect(getSelectedTab()).toHaveTextContent('第 3 天');
    expect(screen.getByText('canvas-active-day-3')).toBeInTheDocument();
  });

  it('keeps the same map component mounted across tab switches', async () => {
    const user = userEvent.setup();
    renderModal(0);
    const before = screen.getByText('canvas-active-day-1');

    await user.click(screen.getByRole('tab', { name: /第 2 天/ }));

    expect(before).toHaveTextContent('canvas-active-day-2');
  });

  it('keeps the geo lookup in sync with the trip, days and selected day', async () => {
    const user = userEvent.setup();
    renderModal(0);
    expect(useTripGeo).toHaveBeenLastCalledWith(7, expect.any(Array), 1);

    await user.click(screen.getByRole('tab', { name: /第 3 天/ }));

    expect(useTripGeo).toHaveBeenLastCalledWith(7, expect.any(Array), 3);
  });

  it('passes only located attractions of every day to the map', () => {
    renderModal(0);

    expect(screen.getByText('canvas-points-10,30')).toBeInTheDocument();
  });

  it('only keeps the selected tab in the tab order', () => {
    renderModal(1);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map(tab => tab.tabIndex)).toEqual([-1, 0, -1]);
  });

  it.each([
    { description: 'moves right', key: '{ArrowRight}', start: 0, expected: 1 },
    { description: 'moves left', key: '{ArrowLeft}', start: 2, expected: 1 },
    {
      description: 'wraps from the last tab to the first',
      key: '{ArrowRight}',
      start: 2,
      expected: 0,
    },
    {
      description: 'wraps from the first tab to the last',
      key: '{ArrowLeft}',
      start: 0,
      expected: 2,
    },
  ])('arrow key navigation $description', async ({ key, start, expected }) => {
    const user = userEvent.setup();
    renderModal(start);
    getSelectedTab().focus();

    await user.keyboard(key);

    expect(getSelectedTab()).toBe(screen.getAllByRole('tab')[expected]);
    expect(getSelectedTab()).toHaveFocus();
  });

  it('ignores other keys on the tab list', async () => {
    const user = userEvent.setup();
    renderModal(1);
    getSelectedTab().focus();

    await user.keyboard('a');

    expect(getSelectedTab()).toHaveTextContent('第 2 天');
  });

  it.each([
    {
      description: 'Escape is pressed',
      act: (user: ReturnType<typeof userEvent.setup>) =>
        user.keyboard('{Escape}'),
    },
    {
      description: 'the close button is clicked',
      act: (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByLabelText('關閉地圖')),
    },
  ])('closes when $description', async ({ act }) => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await act(user);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked but not when the panel is', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('day-map-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when the initial day does not exist', () => {
    renderModal(9);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stops listening for Escape after unmount', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { unmount } = render(
      <DayMapModal
        tripId={7}
        days={makeDays()}
        initialDayIndex={0}
        onClose={onClose}
      />,
    );

    unmount();
    await user.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('DayMapModal notice', () => {
  it('always shows the pin legend', () => {
    renderModal();

    expect(screen.getByText('當天景點')).toBeInTheDocument();
    expect(screen.getByText('其他天')).toBeInTheDocument();
  });

  it.each([
    {
      description: 'locations are being resolved',
      state: { resolving: true },
      day: 0,
      message: '正在定位景點…',
    },
    {
      description: 'the resolve request failed',
      state: { failed: true },
      day: 0,
      message: '無法取得景點座標，僅顯示已知的位置',
    },
    {
      description: 'some of the day cannot be located',
      state: {},
      day: 0,
      message: '有 1 個景點無法在地圖上定位',
    },
    {
      description: 'some cannot be located and name lookups ran out',
      state: { geocodeExhausted: true },
      day: 0,
      message: '有 1 個景點無法在地圖上定位（今日地點查詢額度已用完）',
    },
  ])('explains it when $description', ({ state, day, message }) => {
    Object.assign(geoState, state);

    renderModal(day);

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it.each([
    { description: 'the day has no attractions', day: 1 },
    { description: 'every attraction of the day is located', day: 2 },
  ])('shows no notice when $description', ({ day }) => {
    renderModal(day);

    expect(screen.queryByText(/無法在地圖上定位/)).not.toBeInTheDocument();
    expect(screen.queryByText('正在定位景點…')).not.toBeInTheDocument();
  });
});
