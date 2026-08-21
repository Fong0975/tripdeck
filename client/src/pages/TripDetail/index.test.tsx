import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import type { Attraction, DayPlan, Trip, TravelConnection } from '@/types';
import { exportToDocx } from '@/utils/exportToDocx';

import { useAttractionActions } from './useAttractionActions';
import { useConnectionActions } from './useConnectionActions';
import { useDayLocationActions } from './useDayLocationActions';
import { useDragAndDrop } from './useDragAndDrop';
import { useTripData } from './useTripData';

import TripDetail from './index';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('./useTripData', () => ({ useTripData: vi.fn() }));
vi.mock('./useAttractionActions', () => ({ useAttractionActions: vi.fn() }));
vi.mock('./useConnectionActions', () => ({ useConnectionActions: vi.fn() }));
vi.mock('./useDayLocationActions', () => ({
  useDayLocationActions: vi.fn(),
}));
vi.mock('./useDragAndDrop', () => ({ useDragAndDrop: vi.fn() }));
vi.mock('@/hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: vi.fn(),
}));
vi.mock('@/utils/exportToDocx', () => ({ exportToDocx: vi.fn() }));

// `sensors: []` in `makeDnd()` means no real drag can ever begin, which
// would otherwise leave `@dnd-kit/core`'s real `DragOverlay` permanently
// gated behind its own internal (untestable-without-a-real-drag) active
// state. Only `DragOverlay` is stubbed so the component's own
// `dnd.activeAttractionId` conditional can be exercised directly.
vi.mock('@dnd-kit/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DragOverlay: ({ children }: { children: ReactNode }) => children,
  };
});

vi.mock('@/components/Navbar', () => ({
  default: () => <div>navbar</div>,
}));

vi.mock('@/components/ui/LoadingIndicator', () => ({
  default: () => <div>loading-indicator</div>,
}));

vi.mock('@/components/AttractionCard', () => ({
  default: () => <div>attraction-card</div>,
}));

vi.mock('./TripHeader', () => ({
  default: ({
    trip,
    onBack,
    onExport,
    exporting,
  }: {
    trip: Trip;
    onBack: () => void;
    onExport: () => void;
    exporting?: boolean;
  }) => (
    <div>
      <span>trip-header-{trip.title}</span>
      <span>exporting:{String(exporting)}</span>
      <button onClick={onBack}>back-trigger</button>
      <button onClick={onExport}>export-trigger</button>
    </div>
  ),
}));

vi.mock('@/components/DayColumn', () => ({
  default: ({
    day,
    dayIndex,
    onAddAttraction,
    onEditAttraction,
    onDeleteAttraction,
    onDuplicateAttraction,
    onEditConnection,
    onAddConnection,
    onAddLocation,
    onUpdateLocation,
    onDeleteLocation,
  }: {
    day: DayPlan;
    dayIndex: number;
    onAddAttraction: (dayIndex: number) => void;
    onEditAttraction: (dayIndex: number, attraction: Attraction) => void;
    onDeleteAttraction: (dayIndex: number, attractionId: number) => void;
    onDuplicateAttraction: (dayIndex: number, attraction: Attraction) => void;
    onEditConnection: (dayIndex: number, connection: TravelConnection) => void;
    onAddConnection: (dayIndex: number, fromId: number, toId: number) => void;
    onAddLocation: (dayIndex: number, name: string) => void;
    onUpdateLocation: (
      dayIndex: number,
      locationId: number,
      name: string,
    ) => void;
    onDeleteLocation: (dayIndex: number, locationId: number) => void;
  }) => (
    <div>
      <span>day-column-{dayIndex}</span>
      <button onClick={() => onAddAttraction(dayIndex)}>
        add-attraction-{dayIndex}
      </button>
      <button onClick={() => onEditAttraction(dayIndex, day.attractions[0])}>
        edit-attraction-{dayIndex}
      </button>
      <button
        onClick={() => onDeleteAttraction(dayIndex, day.attractions[0].id)}
      >
        delete-attraction-{dayIndex}
      </button>
      <button
        onClick={() => onDuplicateAttraction(dayIndex, day.attractions[0])}
      >
        duplicate-attraction-{dayIndex}
      </button>
      {day.connections[0] && (
        <button onClick={() => onEditConnection(dayIndex, day.connections[0])}>
          edit-connection-{dayIndex}
        </button>
      )}
      <button onClick={() => onAddConnection(dayIndex, 10, 11)}>
        add-connection-{dayIndex}
      </button>
      <button onClick={() => onAddLocation(dayIndex, 'New Location')}>
        add-location-{dayIndex}
      </button>
      <button
        onClick={() => onUpdateLocation(dayIndex, 50, 'Updated Location')}
      >
        update-location-{dayIndex}
      </button>
      <button onClick={() => onDeleteLocation(dayIndex, 50)}>
        delete-location-{dayIndex}
      </button>
    </div>
  ),
}));

vi.mock('@/components/AttractionModal', () => ({
  default: ({
    attraction,
    onClose,
    onSave,
  }: {
    tripId?: number;
    attraction?: Attraction;
    onClose: () => void;
    onSave: (
      attraction: Attraction,
      stagedImages?: { file: File; title: string }[],
    ) => void;
  }) => (
    <div>
      <span>attraction-modal</span>
      <span>{attraction ? `editing-${attraction.id}` : 'creating'}</span>
      <button onClick={onClose}>close-attraction-modal</button>
      <button onClick={() => onSave(attraction ?? { id: 0, name: 'New' })}>
        save-attraction-modal
      </button>
    </div>
  ),
}));

vi.mock('@/components/TravelConnectionModal', () => ({
  default: ({
    connection,
    fromName,
    toName,
    onClose,
    onSave,
  }: {
    tripId?: number;
    connection: TravelConnection;
    fromName: string;
    toName: string;
    onClose: () => void;
    onSave: (connection: TravelConnection) => void;
  }) => (
    <div>
      <span>connection-modal</span>
      <span>
        {fromName} to {toName}
      </span>
      <button onClick={onClose}>close-connection-modal</button>
      <button onClick={() => onSave(connection)}>save-connection-modal</button>
    </div>
  ),
}));

vi.mock('@/components/TripChecklistPanel', () => ({
  default: ({
    tripId,
    onDirtyChange,
  }: {
    tripId: number;
    onDirtyChange?: (dirty: boolean) => void;
  }) => (
    <div>
      <span>trip-checklist-panel-{tripId}</span>
      <button onClick={() => onDirtyChange?.(true)}>mark-dirty</button>
    </div>
  ),
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  default: ({
    title,
    onCancel,
    onConfirm,
  }: {
    title: string;
    message: string;
    cancelLabel?: string;
    confirmLabel?: string;
    onCancel: () => void;
    onConfirm: () => void;
  }) => (
    <div>
      <span>{title}</span>
      <button onClick={onCancel}>cancel-leave</button>
      <button onClick={onConfirm}>confirm-leave</button>
    </div>
  ),
}));

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 1,
    title: 'Trip A',
    destination: 'Tokyo',
    startDate: '2026-01-01',
    endDate: '2026-01-02',
    createdAt: '2026-01-01',
    ...overrides,
  };
}

function makeDays(overrides: Partial<DayPlan>[] = []): DayPlan[] {
  const base: DayPlan[] = [
    {
      id: 1,
      day: 1,
      date: '2026-01-01',
      locations: [],
      attractions: [
        { id: 10, name: 'Attraction A' },
        { id: 11, name: 'Attraction B' },
      ],
      connections: [
        {
          id: 100,
          fromAttractionId: 10,
          toAttractionId: 11,
          transportMode: 'walk',
        },
      ],
    },
    {
      id: 2,
      day: 2,
      date: '2026-01-02',
      locations: [],
      attractions: [{ id: 20, name: 'Attraction C' }],
      connections: [],
    },
  ];
  return base.map((day, i) => ({ ...day, ...overrides[i] }));
}

function makeTripData(
  overrides: Partial<ReturnType<typeof useTripData>> = {},
): ReturnType<typeof useTripData> {
  return {
    trip: makeTrip(),
    content: { tripId: 1, days: makeDays() },
    reloadContent: vi.fn(),
    ...overrides,
  };
}

function makeAttractionActions(
  overrides: Partial<ReturnType<typeof useAttractionActions>> = {},
): ReturnType<typeof useAttractionActions> {
  return {
    handleSaveAttraction: vi.fn(),
    handleDeleteAttraction: vi.fn(),
    handleDuplicateAttraction: vi.fn(),
    ...overrides,
  };
}

function makeConnectionActions(
  overrides: Partial<ReturnType<typeof useConnectionActions>> = {},
): ReturnType<typeof useConnectionActions> {
  return {
    handleAddConnection: vi.fn(),
    handleSaveConnection: vi.fn(),
    ...overrides,
  };
}

function makeDayLocationActions(
  overrides: Partial<ReturnType<typeof useDayLocationActions>> = {},
): ReturnType<typeof useDayLocationActions> {
  return {
    handleAddLocation: vi.fn(),
    handleUpdateLocation: vi.fn(),
    handleDeleteLocation: vi.fn(),
    ...overrides,
  };
}

function makeDnd(
  overrides: Partial<ReturnType<typeof useDragAndDrop>> = {},
): ReturnType<typeof useDragAndDrop> {
  return {
    sensors: [],
    activeAttractionId: null,
    handleDragStart: vi.fn(),
    handleDragEnd: vi.fn(),
    getActiveAttraction: vi.fn(() => undefined),
    ...overrides,
  };
}

function makeGuard(
  overrides: Partial<ReturnType<typeof useUnsavedChangesGuard>> = {},
): ReturnType<typeof useUnsavedChangesGuard> {
  return {
    showLeaveConfirm: false,
    guardedLeave: vi.fn(),
    confirmLeave: vi.fn(),
    cancelLeave: vi.fn(),
    ...overrides,
  };
}

function renderTripDetail() {
  return render(<TripDetail />);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useTripData).mockReturnValue(makeTripData());
  vi.mocked(useAttractionActions).mockReturnValue(makeAttractionActions());
  vi.mocked(useConnectionActions).mockReturnValue(makeConnectionActions());
  vi.mocked(useDayLocationActions).mockReturnValue(makeDayLocationActions());
  vi.mocked(useDragAndDrop).mockReturnValue(makeDnd());
  vi.mocked(useUnsavedChangesGuard).mockReturnValue(makeGuard());
  vi.mocked(exportToDocx).mockResolvedValue(undefined);
});

describe('TripDetail', () => {
  it('shows only the loading indicator while trip or content is missing', () => {
    vi.mocked(useTripData).mockReturnValue(
      makeTripData({ trip: null, content: null }),
    );

    renderTripDetail();

    expect(screen.getByText('loading-indicator')).toBeInTheDocument();
    expect(screen.queryByText('navbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/^trip-header-/)).not.toBeInTheDocument();
  });

  it('renders the loaded board with navbar, header, tabs and day columns', () => {
    renderTripDetail();

    expect(screen.getByText('navbar')).toBeInTheDocument();
    expect(screen.getByText('trip-header-Trip A')).toBeInTheDocument();
    expect(screen.getByText('行程規劃')).toBeInTheDocument();
    expect(screen.getByText('行李清單')).toBeInTheDocument();
    expect(screen.getByText('day-column-0')).toBeInTheDocument();
    expect(screen.getByText('day-column-1')).toBeInTheDocument();
    expect(
      screen.queryByText(/^trip-checklist-panel-/),
    ).not.toBeInTheDocument();
  });

  it('renders the drag overlay attraction card only when a drag is active', () => {
    vi.mocked(useDragAndDrop).mockReturnValue(
      makeDnd({
        activeAttractionId: 10,
        getActiveAttraction: vi.fn(() => ({ id: 10, name: 'Attraction A' })),
      }),
    );

    renderTripDetail();

    expect(screen.getByText('attraction-card')).toBeInTheDocument();
  });

  it('switches to the checklist panel and back via the tab bar', async () => {
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('行李清單'));

    expect(screen.getByText('trip-checklist-panel-1')).toBeInTheDocument();
    expect(screen.queryByText('day-column-0')).not.toBeInTheDocument();

    await user.click(screen.getByText('行程規劃'));

    expect(
      screen.queryByText(/^trip-checklist-panel-/),
    ).not.toBeInTheDocument();
    expect(screen.getByText('day-column-0')).toBeInTheDocument();
  });

  it('passes the mocked onDirtyChange result to useUnsavedChangesGuard', async () => {
    const user = userEvent.setup();
    renderTripDetail();
    await user.click(screen.getByText('行李清單'));

    await user.click(screen.getByText('mark-dirty'));

    const calls = vi.mocked(useUnsavedChangesGuard).mock.calls;
    expect(calls[calls.length - 1][0]).toBe(true);
  });

  it('invokes guardedLeave when the header back trigger is clicked', async () => {
    const guardedLeave = vi.fn();
    vi.mocked(useUnsavedChangesGuard).mockReturnValue(
      makeGuard({ guardedLeave }),
    );
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('back-trigger'));

    expect(guardedLeave).toHaveBeenCalledTimes(1);
  });

  it('exports the trip and tracks the exporting state across the async call', async () => {
    let resolveExport!: () => void;
    const exportPromise = new Promise<void>(resolve => {
      resolveExport = resolve;
    });
    vi.mocked(exportToDocx).mockReturnValue(exportPromise);
    const trip = makeTrip();
    const content = { tripId: 1, days: makeDays() };
    vi.mocked(useTripData).mockReturnValue(makeTripData({ trip, content }));
    const user = userEvent.setup();
    renderTripDetail();

    expect(screen.getByText('exporting:false')).toBeInTheDocument();

    await user.click(screen.getByText('export-trigger'));

    expect(screen.getByText('exporting:true')).toBeInTheDocument();
    expect(exportToDocx).toHaveBeenCalledWith(trip, content);

    await act(async () => {
      resolveExport();
      await exportPromise;
    });

    expect(screen.getByText('exporting:false')).toBeInTheDocument();
  });

  it('ignores extra export triggers while an export is already in progress', async () => {
    let resolveExport!: () => void;
    const exportPromise = new Promise<void>(resolve => {
      resolveExport = resolve;
    });
    vi.mocked(exportToDocx).mockReturnValue(exportPromise);
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('export-trigger'));
    expect(screen.getByText('exporting:true')).toBeInTheDocument();

    await user.click(screen.getByText('export-trigger'));

    expect(exportToDocx).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveExport();
      await exportPromise;
    });
  });

  it('opens the attraction modal in create mode from the add-attraction trigger', async () => {
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('add-attraction-0'));

    expect(screen.getByText('attraction-modal')).toBeInTheDocument();
    expect(screen.getByText('creating')).toBeInTheDocument();
  });

  it('saves a newly-created attraction for the right day', async () => {
    const handleSaveAttraction = vi.fn();
    vi.mocked(useAttractionActions).mockReturnValue(
      makeAttractionActions({ handleSaveAttraction }),
    );
    const user = userEvent.setup();
    renderTripDetail();
    await user.click(screen.getByText('add-attraction-1'));

    await user.click(screen.getByText('save-attraction-modal'));

    expect(handleSaveAttraction).toHaveBeenCalledWith(
      1,
      { id: 0, name: 'New' },
      undefined,
    );
  });

  it('closes the attraction modal via its onClose trigger', async () => {
    const user = userEvent.setup();
    renderTripDetail();
    await user.click(screen.getByText('add-attraction-0'));

    await user.click(screen.getByText('close-attraction-modal'));

    expect(screen.queryByText('attraction-modal')).not.toBeInTheDocument();
  });

  it('opens the attraction modal in edit mode with the clicked attraction', async () => {
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('edit-attraction-0'));

    expect(screen.getByText('attraction-modal')).toBeInTheDocument();
    expect(screen.getByText('editing-10')).toBeInTheDocument();
  });

  it('saves an edited attraction for the right day', async () => {
    const handleSaveAttraction = vi.fn();
    vi.mocked(useAttractionActions).mockReturnValue(
      makeAttractionActions({ handleSaveAttraction }),
    );
    const user = userEvent.setup();
    renderTripDetail();
    await user.click(screen.getByText('edit-attraction-0'));

    await user.click(screen.getByText('save-attraction-modal'));

    expect(handleSaveAttraction).toHaveBeenCalledWith(0, {
      id: 10,
      name: 'Attraction A',
    });
  });

  it('calls handleDeleteAttraction with the right day and attraction id', async () => {
    const handleDeleteAttraction = vi.fn();
    vi.mocked(useAttractionActions).mockReturnValue(
      makeAttractionActions({ handleDeleteAttraction }),
    );
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('delete-attraction-0'));

    expect(handleDeleteAttraction).toHaveBeenCalledWith(0, 10);
  });

  it('calls handleDuplicateAttraction with the right day and attraction', async () => {
    const handleDuplicateAttraction = vi.fn();
    vi.mocked(useAttractionActions).mockReturnValue(
      makeAttractionActions({ handleDuplicateAttraction }),
    );
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('duplicate-attraction-0'));

    expect(handleDuplicateAttraction).toHaveBeenCalledWith(0, {
      id: 10,
      name: 'Attraction A',
    });
  });

  it('calls handleAddConnection with the right args from the add-connection trigger', async () => {
    const handleAddConnection = vi.fn();
    vi.mocked(useConnectionActions).mockReturnValue(
      makeConnectionActions({ handleAddConnection }),
    );
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('add-connection-0'));

    expect(handleAddConnection).toHaveBeenCalledWith(0, 10, 11);
  });

  it('calls handleAddLocation with the right day and name from the add-location trigger', async () => {
    const handleAddLocation = vi.fn();
    vi.mocked(useDayLocationActions).mockReturnValue(
      makeDayLocationActions({ handleAddLocation }),
    );
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('add-location-0'));

    expect(handleAddLocation).toHaveBeenCalledWith(0, 'New Location');
  });

  it('calls handleUpdateLocation with the right day, location id and name from the update-location trigger', async () => {
    const handleUpdateLocation = vi.fn();
    vi.mocked(useDayLocationActions).mockReturnValue(
      makeDayLocationActions({ handleUpdateLocation }),
    );
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('update-location-0'));

    expect(handleUpdateLocation).toHaveBeenCalledWith(
      0,
      50,
      'Updated Location',
    );
  });

  it('calls handleDeleteLocation with the right day and location id from the delete-location trigger', async () => {
    const handleDeleteLocation = vi.fn();
    vi.mocked(useDayLocationActions).mockReturnValue(
      makeDayLocationActions({ handleDeleteLocation }),
    );
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('delete-location-0'));

    expect(handleDeleteLocation).toHaveBeenCalledWith(0, 50);
  });

  it('opens the connection modal when the openConnectionModal callback passed to useConnectionActions fires', () => {
    renderTripDetail();

    const calls = vi.mocked(useConnectionActions).mock.calls;
    const openConnectionModal = calls[calls.length - 1][4];
    const connection: TravelConnection = {
      id: 0,
      fromAttractionId: 10,
      toAttractionId: 11,
      transportMode: 'transit',
    };

    act(() => {
      openConnectionModal(0, connection);
    });

    expect(screen.getByText('connection-modal')).toBeInTheDocument();
    expect(
      screen.getByText('Attraction A to Attraction B'),
    ).toBeInTheDocument();
  });

  it('opens the connection modal from the edit-connection trigger with resolved names', async () => {
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('edit-connection-0'));

    expect(screen.getByText('connection-modal')).toBeInTheDocument();
    expect(
      screen.getByText('Attraction A to Attraction B'),
    ).toBeInTheDocument();
  });

  it('falls back to empty names when the connection references unknown attractions', async () => {
    vi.mocked(useTripData).mockReturnValue(
      makeTripData({
        content: {
          tripId: 1,
          days: makeDays([
            {
              connections: [
                {
                  id: 100,
                  fromAttractionId: 999,
                  toAttractionId: 998,
                  transportMode: 'walk',
                },
              ],
            },
          ]),
        },
      }),
    );
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('edit-connection-0'));

    expect(screen.getByText('to')).toBeInTheDocument();
  });

  it('closes the connection modal via its onClose trigger', async () => {
    const user = userEvent.setup();
    renderTripDetail();
    await user.click(screen.getByText('edit-connection-0'));

    await user.click(screen.getByText('close-connection-modal'));

    expect(screen.queryByText('connection-modal')).not.toBeInTheDocument();
  });

  it('saves a connection for the right day', async () => {
    const handleSaveConnection = vi.fn();
    vi.mocked(useConnectionActions).mockReturnValue(
      makeConnectionActions({ handleSaveConnection }),
    );
    const user = userEvent.setup();
    renderTripDetail();
    await user.click(screen.getByText('edit-connection-0'));

    await user.click(screen.getByText('save-connection-modal'));

    expect(handleSaveConnection).toHaveBeenCalledWith(0, {
      id: 100,
      fromAttractionId: 10,
      toAttractionId: 11,
      transportMode: 'walk',
    });
  });

  it('does not render ConfirmDialog when showLeaveConfirm is false', () => {
    renderTripDetail();

    expect(screen.queryByText('確定要離開嗎？')).not.toBeInTheDocument();
  });

  it('renders ConfirmDialog and wires cancel/confirm when showLeaveConfirm is true', async () => {
    const cancelLeave = vi.fn();
    const confirmLeave = vi.fn();
    vi.mocked(useUnsavedChangesGuard).mockReturnValue(
      makeGuard({ showLeaveConfirm: true, cancelLeave, confirmLeave }),
    );
    const user = userEvent.setup();
    renderTripDetail();

    expect(screen.getByText('確定要離開嗎？')).toBeInTheDocument();

    await user.click(screen.getByText('cancel-leave'));
    expect(cancelLeave).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('confirm-leave'));
    expect(confirmLeave).toHaveBeenCalledTimes(1);
  });
});
