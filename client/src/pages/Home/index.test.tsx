import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Trip } from '@/types';

import { useHomeData } from './useHomeData';

import Home from './index';

vi.mock('./useHomeData', () => ({
  useHomeData: vi.fn(),
}));

vi.mock('@/components/Navbar', () => ({
  default: () => <div>navbar</div>,
}));

vi.mock('./HeroSection', () => ({
  default: () => <div>hero-section</div>,
}));

vi.mock('./ChecklistSection', () => ({
  default: () => <div>checklist-section</div>,
}));

vi.mock('./TripList', () => ({
  default: ({
    trips,
    loading,
    onAdd,
    onDelete,
  }: {
    trips: Trip[];
    loading: boolean;
    onAdd: () => void;
    onDelete: (id: number) => void;
  }) => (
    <div>
      <span>trip-list</span>
      <span>trips:{trips.length}</span>
      <span>loading:{String(loading)}</span>
      <button onClick={onAdd}>trigger-add</button>
      <button onClick={() => onDelete(1)}>trigger-delete</button>
    </div>
  ),
}));

vi.mock('@/components/AddTripModal', () => ({
  default: ({
    onClose,
    onAdded,
  }: {
    onClose: () => void;
    onAdded: (trip: Trip) => void;
  }) => (
    <div>
      <span>add-trip-modal</span>
      <button onClick={onClose}>trigger-close</button>
      <button
        onClick={() =>
          onAdded({
            id: 9,
            title: 'New Trip',
            destination: null,
            startDate: '2026-01-01',
            endDate: '2026-01-05',
            createdAt: '2026-01-01',
          })
        }
      >
        trigger-added
      </button>
    </div>
  ),
}));

function makeHomeData(overrides: Partial<ReturnType<typeof useHomeData>> = {}) {
  return {
    trips: [],
    loading: false,
    handleTripAdded: vi.fn(),
    handleDeleteTrip: vi.fn(),
    ...overrides,
  };
}

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useHomeData).mockReturnValue(makeHomeData());
  });

  it('renders the navbar, hero, trip list, and checklist sections', () => {
    render(<Home />);

    expect(screen.getByText('navbar')).toBeInTheDocument();
    expect(screen.getByText('hero-section')).toBeInTheDocument();
    expect(screen.getByText('trip-list')).toBeInTheDocument();
    expect(screen.getByText('checklist-section')).toBeInTheDocument();
    expect(screen.queryByText('add-trip-modal')).not.toBeInTheDocument();
  });

  it('passes loading and trips from useHomeData through to TripList', () => {
    const trip: Trip = {
      id: 1,
      title: 'Trip A',
      destination: null,
      startDate: '2026-01-01',
      endDate: '2026-01-05',
      createdAt: '2026-01-01',
    };
    vi.mocked(useHomeData).mockReturnValue(
      makeHomeData({ trips: [trip], loading: true }),
    );

    render(<Home />);

    expect(screen.getByText('trips:1')).toBeInTheDocument();
    expect(screen.getByText('loading:true')).toBeInTheDocument();
  });

  it('shows the modal after triggering add and hides it after closing', async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole('button', { name: 'trigger-add' }));
    expect(screen.getByText('add-trip-modal')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'trigger-close' }));
    expect(screen.queryByText('add-trip-modal')).not.toBeInTheDocument();
  });

  it('calls handleDeleteTrip with the trip id from the trip-list delete trigger', async () => {
    const user = userEvent.setup();
    const handleDeleteTrip = vi.fn();
    vi.mocked(useHomeData).mockReturnValue(makeHomeData({ handleDeleteTrip }));
    render(<Home />);

    await user.click(screen.getByRole('button', { name: 'trigger-delete' }));

    expect(handleDeleteTrip).toHaveBeenCalledWith(1);
  });

  it('calls handleTripAdded with the new trip and closes the modal on add', async () => {
    const user = userEvent.setup();
    const handleTripAdded = vi.fn();
    vi.mocked(useHomeData).mockReturnValue(makeHomeData({ handleTripAdded }));
    render(<Home />);
    await user.click(screen.getByRole('button', { name: 'trigger-add' }));

    await user.click(screen.getByRole('button', { name: 'trigger-added' }));

    expect(handleTripAdded).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9, title: 'New Trip' }),
    );
    expect(screen.queryByText('add-trip-modal')).not.toBeInTheDocument();
  });
});
