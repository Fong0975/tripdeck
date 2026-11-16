import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeTrip } from '@/test-utils/fixtures';
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

vi.mock('@/components/Checklist/template/TemplateModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div>
      <span>template-modal</span>
      <button onClick={onClose}>trigger-template-close</button>
    </div>
  ),
}));

const sampleTrip = makeTrip({ title: 'Trip A' });

vi.mock('./TripList', () => ({
  default: ({
    trips,
    loading,
    loadError,
    onRetry,
    onAdd,
    onDelete,
    onEdit,
    onImportExport,
    onOpenTemplate,
  }: {
    trips: Trip[];
    loading: boolean;
    loadError?: boolean;
    onRetry?: () => void;
    onAdd: () => void;
    onDelete: (id: number) => void;
    onEdit: (trip: Trip) => void;
    onImportExport: () => void;
    onOpenTemplate: () => void;
  }) => (
    <div>
      <span>trip-list</span>
      <span>trips:{trips.length}</span>
      <span>loading:{String(loading)}</span>
      <span>load-error:{String(loadError)}</span>
      <button onClick={() => onRetry?.()}>trigger-retry</button>
      <button onClick={onAdd}>trigger-add</button>
      <button onClick={() => onDelete(1)}>trigger-delete</button>
      <button onClick={() => onEdit(sampleTrip)}>trigger-edit</button>
      <button onClick={onImportExport}>trigger-import-export</button>
      <button onClick={onOpenTemplate}>trigger-template</button>
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
      <button onClick={() => onAdded(makeTrip({ id: 9, title: 'New Trip' }))}>
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
    onImagesChanged,
  }: {
    trip: Trip;
    onClose: () => void;
    onUpdated: (trip: Trip) => void;
    onImagesChanged?: () => void;
  }) => (
    <div>
      <span>edit-trip-modal</span>
      <span>editing:{trip.title}</span>
      <button onClick={onClose}>trigger-edit-close</button>
      <button onClick={() => onUpdated({ ...trip, title: 'Updated Trip' })}>
        trigger-updated
      </button>
      <button onClick={onImagesChanged}>trigger-images-changed</button>
    </div>
  ),
}));

function makeHomeData(overrides: Partial<ReturnType<typeof useHomeData>> = {}) {
  return {
    trips: [],
    loading: false,
    loadError: false,
    handleTripAdded: vi.fn(),
    handleDeleteTrip: vi.fn(),
    handleTripUpdated: vi.fn(),
    reloadTrips: vi.fn(),
    ...overrides,
  };
}

describe('Home', () => {
  beforeEach(() => {
    vi.mocked(useHomeData).mockReturnValue(makeHomeData());
  });

  it('renders the navbar, hero and trip list with every modal closed', () => {
    render(<Home />);

    expect(screen.getByText('navbar')).toBeInTheDocument();
    expect(screen.getByText('hero-section')).toBeInTheDocument();
    expect(screen.getByText('trip-list')).toBeInTheDocument();
    expect(screen.queryByText('template-modal')).not.toBeInTheDocument();
    expect(screen.queryByText('add-trip-modal')).not.toBeInTheDocument();
    expect(screen.queryByText('edit-trip-modal')).not.toBeInTheDocument();
    expect(screen.queryByText('import-export-modal')).not.toBeInTheDocument();
  });

  it('passes loading and trips from useHomeData through to TripList', () => {
    const trip = makeTrip({ title: 'Trip A' });
    vi.mocked(useHomeData).mockReturnValue(
      makeHomeData({ trips: [trip], loading: true, loadError: true }),
    );

    render(<Home />);

    expect(screen.getByText('trips:1')).toBeInTheDocument();
    expect(screen.getByText('loading:true')).toBeInTheDocument();
    expect(screen.getByText('load-error:true')).toBeInTheDocument();
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

  it('shows the template modal after triggering it and hides it after closing', async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole('button', { name: 'trigger-template' }));
    expect(screen.getByText('template-modal')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'trigger-template-close' }),
    );
    expect(screen.queryByText('template-modal')).not.toBeInTheDocument();
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

  it.each([
    {
      description: 'the import/export modal reports an import',
      openTrigger: 'trigger-import-export',
      changeTrigger: 'trigger-imported',
    },
    {
      description: 'the edit trip modal reports changed images',
      openTrigger: 'trigger-edit',
      changeTrigger: 'trigger-images-changed',
    },
    {
      description: 'the trip list asks to retry a failed load',
      openTrigger: undefined,
      changeTrigger: 'trigger-retry',
    },
  ])(
    'calls reloadTrips when $description',
    async ({ openTrigger, changeTrigger }) => {
      const user = userEvent.setup();
      const reloadTrips = vi.fn();
      vi.mocked(useHomeData).mockReturnValue(makeHomeData({ reloadTrips }));
      render(<Home />);
      if (openTrigger) {
        await user.click(screen.getByRole('button', { name: openTrigger }));
      }

      await user.click(screen.getByRole('button', { name: changeTrigger }));

      expect(reloadTrips).toHaveBeenCalledTimes(1);
    },
  );
});
