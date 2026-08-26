import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Trip } from '@/types';

import TripList from './TripList';

vi.mock('@/components/TripCard', () => ({
  default: ({
    trip,
    onDelete,
    onEdit,
  }: {
    trip: Trip;
    onDelete: (id: number) => void;
    onEdit: (trip: Trip) => void;
  }) => (
    <div>
      <span>{trip.title}</span>
      <button onClick={() => onDelete(trip.id)}>delete-{trip.id}</button>
      <button onClick={() => onEdit(trip)}>edit-{trip.id}</button>
    </div>
  ),
}));

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 1,
    title: 'Trip',
    destination: null,
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    createdAt: '2026-01-01',
    ...overrides,
  };
}

describe('TripList', () => {
  it('shows the loading indicator and no trip cards or empty state while loading', () => {
    render(
      <TripList
        trips={[]}
        loading={true}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onImportExport={vi.fn()}
      />,
    );

    expect(screen.getByText('載入中…')).toBeInTheDocument();
    expect(screen.queryByText('✈️')).not.toBeInTheDocument();
    expect(
      screen.queryByText('還沒有旅程，點擊「新增旅程」開始規劃吧！'),
    ).not.toBeInTheDocument();
  });

  it('shows the empty state when not loading and there are no trips', () => {
    render(
      <TripList
        trips={[]}
        loading={false}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onImportExport={vi.fn()}
      />,
    );

    expect(screen.getByText('✈️')).toBeInTheDocument();
    expect(
      screen.getByText('還沒有旅程，點擊「新增旅程」開始規劃吧！'),
    ).toBeInTheDocument();
    expect(screen.queryByText('載入中…')).not.toBeInTheDocument();
  });

  it('renders one trip card per trip when not loading', () => {
    const trips = [
      makeTrip({ id: 1, title: 'Trip A' }),
      makeTrip({ id: 2, title: 'Trip B' }),
    ];
    render(
      <TripList
        trips={trips}
        loading={false}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onImportExport={vi.fn()}
      />,
    );

    expect(screen.getByText('Trip A')).toBeInTheDocument();
    expect(screen.getByText('Trip B')).toBeInTheDocument();
  });

  it('calls onAdd when the "新增旅程" button is clicked', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <TripList
        trips={[]}
        loading={false}
        onAdd={onAdd}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onImportExport={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /新增旅程/ }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('calls onImportExport when the "匯入 / 匯出" button is clicked', async () => {
    const user = userEvent.setup();
    const onImportExport = vi.fn();
    render(
      <TripList
        trips={[]}
        loading={false}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onImportExport={onImportExport}
      />,
    );

    await user.click(screen.getByRole('button', { name: /匯入 \/ 匯出/ }));

    expect(onImportExport).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete with the trip id when a trip card requests deletion', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const trips = [makeTrip({ id: 5, title: 'Trip A' })];
    render(
      <TripList
        trips={trips}
        loading={false}
        onAdd={vi.fn()}
        onDelete={onDelete}
        onEdit={vi.fn()}
        onImportExport={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'delete-5' }));

    expect(onDelete).toHaveBeenCalledWith(5);
  });

  it('calls onEdit with the trip when a trip card requests editing', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const trip = makeTrip({ id: 5, title: 'Trip A' });
    render(
      <TripList
        trips={[trip]}
        loading={false}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
        onImportExport={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'edit-5' }));

    expect(onEdit).toHaveBeenCalledWith(trip);
  });
});
