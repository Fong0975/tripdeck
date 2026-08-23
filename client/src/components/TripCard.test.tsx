import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Trip } from '@/types';

import TripCard from './TripCard';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 1,
    title: 'Tokyo Trip',
    destination: null,
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    createdAt: '2026-01-01',
    ...overrides,
  };
}

function renderCard(trip: Trip, onDelete = vi.fn(), onEdit = vi.fn()) {
  return render(
    <MemoryRouter>
      <TripCard trip={trip} onDelete={onDelete} onEdit={onEdit} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TripCard', () => {
  it('navigates to the trip detail page when clicked', async () => {
    const user = userEvent.setup();
    renderCard(makeTrip({ id: 42 }));

    await user.click(screen.getByText('Tokyo Trip'));

    expect(mockNavigate).toHaveBeenCalledWith('/trip/42');
  });

  it.each([
    { description: 'destination is set', destination: 'Japan' },
    { description: 'destination is not set', destination: null },
  ])(
    'renders the destination row only when $description',
    ({ destination }) => {
      renderCard(makeTrip({ destination }));

      if (destination) {
        expect(screen.getByText(destination)).toBeInTheDocument();
      } else {
        expect(screen.queryByText('Japan')).not.toBeInTheDocument();
      }
    },
  );

  it.each([
    { description: 'description is set', description_: 'A relaxing trip' },
    { description: 'description is not set', description_: null },
  ])(
    'renders the description paragraph only when $description',
    ({ description_ }) => {
      renderCard(makeTrip({ description: description_ }));

      if (description_) {
        expect(screen.getByText(description_)).toBeInTheDocument();
      } else {
        expect(screen.queryByText('A relaxing trip')).not.toBeInTheDocument();
      }
    },
  );

  it('arms the delete confirmation on first click without deleting', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderCard(makeTrip(), onDelete);

    await user.click(screen.getByTitle('刪除旅程'));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByTitle('再次點擊確認刪除')).toBeInTheDocument();
  });

  it('deletes on a second click within the confirmation window', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    renderCard(makeTrip({ id: 7 }), onDelete);

    await user.click(screen.getByTitle('刪除旅程'));
    await user.click(screen.getByTitle('再次點擊確認刪除'));

    expect(onDelete).toHaveBeenCalledWith(7);
  });

  it('does not navigate when the delete button is clicked', async () => {
    const user = userEvent.setup();
    renderCard(makeTrip());

    await user.click(screen.getByTitle('刪除旅程'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('calls onEdit with the trip when the edit button is clicked', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    const trip = makeTrip({ id: 9 });
    renderCard(trip, vi.fn(), onEdit);

    await user.click(screen.getByTitle('編輯旅程'));

    expect(onEdit).toHaveBeenCalledWith(trip);
  });

  it('does not navigate when the edit button is clicked', async () => {
    const user = userEvent.setup();
    renderCard(makeTrip());

    await user.click(screen.getByTitle('編輯旅程'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
