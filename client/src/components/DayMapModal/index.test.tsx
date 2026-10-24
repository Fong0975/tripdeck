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

  it('switches the map to the clicked day without remounting it', async () => {
    const user = userEvent.setup();
    renderModal(0);
    const canvas = screen.getByText('canvas-active-day-1');

    await user.click(screen.getByRole('tab', { name: /第 3 天/ }));

    expect(getSelectedTab()).toHaveTextContent('第 3 天');
    expect(canvas).toHaveTextContent('canvas-active-day-3');
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

  it.each([
    {
      description: 'a selected day with an unlocated attraction',
      day: 0,
      state: {},
      message: '有 1 個景點無法在地圖上定位',
    },
    {
      description: 'a lookup in progress',
      day: 0,
      state: { resolving: true },
      message: '正在定位景點…',
    },
  ])('shows the notice for $description', ({ day, state, message }) => {
    Object.assign(geoState, state);

    renderModal(day);

    expect(screen.getByRole('status')).toHaveTextContent(message);
  });

  it.each([
    { description: 'the day has no attractions', day: 1 },
    { description: 'every attraction of the day is located', day: 2 },
  ])('shows no status notice when $description', ({ day }) => {
    renderModal(day);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
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
