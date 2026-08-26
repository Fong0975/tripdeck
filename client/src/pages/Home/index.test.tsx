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

const sampleTrip: Trip = {
  id: 1,
  title: 'Trip A',
  destination: null,
  startDate: '2026-01-01',
  endDate: '2026-01-05',
  createdAt: '2026-01-01',
};

vi.mock('./TripList', () => ({
  default: ({
    trips,
    loading,
    onAdd,
    onDelete,
    onEdit,
    onImportExport,
  }: {
    trips: Trip[];
    loading: boolean;
    onAdd: () => void;
    onDelete: (id: number) => void;
    onEdit: (trip: Trip) => void;
    onImportExport: () => void;
  }) => (
    <div>
      <span>trip-list</span>
      <span>trips:{trips.length}</span>
      <span>loading:{String(loading)}</span>
      <button onClick={onAdd}>trigger-add</button>
      <button onClick={() => onDelete(1)}>trigger-delete</button>
      <button onClick={() => onEdit(sampleTrip)}>trigger-edit</button>
      <button onClick={onImportExport}>trigger-import-export</button>
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

vi.mock('@/components/ImportExportModal', () => ({
  default: ({
    onClose,
    onImported,
  }: {
    onClose: () => void;
    onImported: () => void;
  }) => (
    <div>
      <span>import-export-modal</span>
      <button onClick={onClose}>trigger-import-export-close</button>
      <button onClick={onImported}>trigger-imported</button>
    </div>
  ),
}));

vi.mock('@/components/EditTripModal', () => ({
  default: ({
    trip,
    onClose,
    onUpdated,
  }: {
    trip: Trip;
    onClose: () => void;
    onUpdated: (trip: Trip) => void;
  }) => (
    <div>
      <span>edit-trip-modal</span>
      <span>editing:{trip.title}</span>
      <button onClick={onClose}>trigger-edit-close</button>
      <button onClick={() => onUpdated({ ...trip, title: 'Updated Trip' })}>
        trigger-updated
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
    handleTripUpdated: vi.fn(),
    reloadTrips: vi.fn(),
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
    expect(screen.queryByText('edit-trip-modal')).not.toBeInTheDocument();
    expect(screen.queryByText('import-export-modal')).not.toBeInTheDocument();
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

  it('shows the edit modal for the requested trip after triggering edit and hides it after closing', async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole('button', { name: 'trigger-edit' }));
    expect(screen.getByText('edit-trip-modal')).toBeInTheDocument();
    expect(screen.getByText('editing:Trip A')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'trigger-edit-close' }),
    );
    expect(screen.queryByText('edit-trip-modal')).not.toBeInTheDocument();
  });

  it('calls handleTripUpdated with the updated trip and closes the modal on update', async () => {
    const user = userEvent.setup();
    const handleTripUpdated = vi.fn();
    vi.mocked(useHomeData).mockReturnValue(makeHomeData({ handleTripUpdated }));
    render(<Home />);
    await user.click(screen.getByRole('button', { name: 'trigger-edit' }));

    await user.click(screen.getByRole('button', { name: 'trigger-updated' }));

    expect(handleTripUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, title: 'Updated Trip' }),
    );
    expect(screen.queryByText('edit-trip-modal')).not.toBeInTheDocument();
  });

  it('shows the import/export modal after triggering it and hides it after closing', async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(
      screen.getByRole('button', { name: 'trigger-import-export' }),
    );
    expect(screen.getByText('import-export-modal')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'trigger-import-export-close' }),
    );
    expect(screen.queryByText('import-export-modal')).not.toBeInTheDocument();
  });

  it('calls reloadTrips when the import/export modal reports an import', async () => {
    const user = userEvent.setup();
    const reloadTrips = vi.fn();
    vi.mocked(useHomeData).mockReturnValue(makeHomeData({ reloadTrips }));
    render(<Home />);
    await user.click(
      screen.getByRole('button', { name: 'trigger-import-export' }),
    );

    await user.click(screen.getByRole('button', { name: 'trigger-imported' }));

    expect(reloadTrips).toHaveBeenCalledTimes(1);
  });
});
