import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { showToast } from '@/lib/toast';
import type { Attraction, DayPlan, Trip, TravelConnection } from '@/types';
import { exportToDocx } from '@/utils/exportToDocx';

import { useAttractionActions } from './useAttractionActions';
import { useConnectionActions } from './useConnectionActions';
import { useDayLocationActions } from './useDayLocationActions';
import { useDayNoteActions } from './useDayNoteActions';
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
vi.mock('./useDayNoteActions', () => ({ useDayNoteActions: vi.fn() }));
vi.mock('./useDragAndDrop', () => ({ useDragAndDrop: vi.fn() }));
vi.mock('@/hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: vi.fn(),
}));
vi.mock('@/utils/exportToDocx', () => ({ exportToDocx: vi.fn() }));
vi.mock('@/lib/toast', () => ({ showToast: vi.fn() }));

vi.mock('@/components/Navbar', () => ({
  default: () => <div>navbar</div>,
}));

vi.mock('@/components/ui/LoadingIndicator', () => ({
  default: () => <div>loading-indicator</div>,
}));

vi.mock('./TripHeader', () => ({
  default: ({
    trip,
    onBack,
    onExport,
    onEdit,
    exporting,
  }: {
    trip: Trip;
    onBack: () => void;
    onExport: () => void;
    onEdit: () => void;
    exporting?: boolean;
  }) => (
    <div>
      <span>trip-header-{trip.title}</span>
      <span>exporting:{String(exporting)}</span>
      <button onClick={onBack}>back-trigger</button>
      <button onClick={onExport}>export-trigger</button>
      <button onClick={onEdit}>edit-trip-trigger</button>
    </div>
  ),
}));

// ItineraryBoard owns the DndContext/DayColumn/DragOverlay rendering itself
// (see ItineraryBoard.test.tsx); here it's mocked to a flat list of trigger
// buttons per day so TripDetail's own composition logic (which modal opens,
// which handler receives which args) can be tested without a real drag
// context.
vi.mock('./ItineraryBoard', () => ({
  default: ({
    days,
    onEditDayNote,
    onAddAttraction,
    onEditAttraction,
    onDeleteAttraction,
    onDuplicateAttraction,
    onEditConnection,
    onDeleteConnection,
    onAddConnection,
    onAddLocation,
    onUpdateLocation,
    onDeleteLocation,
  }: {
    days: DayPlan[];
    onEditDayNote: (dayIndex: number) => void;
    onAddAttraction: (dayIndex: number) => void;
    onEditAttraction: (dayIndex: number, attraction: Attraction) => void;
    onDeleteAttraction: (dayIndex: number, attractionId: number) => void;
    onDuplicateAttraction: (dayIndex: number, attraction: Attraction) => void;
    onEditConnection: (dayIndex: number, connection: TravelConnection) => void;
    onDeleteConnection: (dayIndex: number, connectionId: number) => void;
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
      {days.map((day, dayIndex) => (
        <div key={day.id}>
          <span>day-column-{dayIndex}</span>
          <button onClick={() => onEditDayNote(dayIndex)}>
            edit-day-note-{dayIndex}
          </button>
          <button onClick={() => onAddAttraction(dayIndex)}>
            add-attraction-{dayIndex}
          </button>
          <button
            onClick={() => onEditAttraction(dayIndex, day.attractions[0])}
          >
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
            <button
              onClick={() => onEditConnection(dayIndex, day.connections[0])}
            >
              edit-connection-{dayIndex}
            </button>
          )}
          {day.connections[0] && (
            <button
              onClick={() =>
                onDeleteConnection(dayIndex, day.connections[0].id)
              }
            >
              delete-connection-{dayIndex}
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
      ))}
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

vi.mock('@/components/EditDayNoteModal', () => ({
  default: ({
    day,
    onClose,
    onSave,
  }: {
    tripId: number;
    day: DayPlan;
    onClose: () => void;
    onSave: (notes: string | null) => void;
  }) => (
    <div>
      <span>edit-day-note-modal</span>
      <span>editing-day-{day.id}</span>
      <button onClick={onClose}>close-edit-day-note-modal</button>
      <button onClick={() => onSave('New notes')}>
        save-edit-day-note-modal
      </button>
    </div>
  ),
}));

vi.mock('@/components/EditTripModal', () => ({
  default: ({
    trip,
    onClose,
    onUpdated,
    onContentChanged,
  }: {
    trip: Trip;
    onClose: () => void;
    onUpdated: (trip: Trip) => void;
    onContentChanged?: () => void;
  }) => (
    <div>
      <span>edit-trip-modal</span>
      <span>editing:{trip.title}</span>
      <button onClick={onClose}>close-edit-trip-modal</button>
      <button onClick={() => onUpdated({ ...trip, title: 'Updated Trip' })}>
        save-edit-trip-modal
      </button>
      <button onClick={() => onContentChanged?.()}>
        content-changed-trigger
      </button>
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
      <button onClick={onCancel}>dialog-cancel</button>
      <button onClick={onConfirm}>dialog-confirm</button>
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
    setTrip: vi.fn(),
    loadError: false,
    retryLoad: vi.fn(),
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
    handleDeleteConnection: vi.fn(),
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

function makeDayNoteActions(
  overrides: Partial<ReturnType<typeof useDayNoteActions>> = {},
): ReturnType<typeof useDayNoteActions> {
  return {
    handleSaveDayNotes: vi.fn(),
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
    showMoveConfirm: false,
    confirmMove: vi.fn(),
    cancelMove: vi.fn(),
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
  vi.mocked(useDayNoteActions).mockReturnValue(makeDayNoteActions());
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

  it('shows a retry button instead of the loading indicator when loading fails', async () => {
    const retryLoad = vi.fn();
    vi.mocked(useTripData).mockReturnValue(
      makeTripData({ trip: null, content: null, loadError: true, retryLoad }),
    );
    const user = userEvent.setup();
    renderTripDetail();

    expect(
      screen.getByText('載入旅程資料失敗，請稍後再試'),
    ).toBeInTheDocument();
    expect(screen.queryByText('loading-indicator')).not.toBeInTheDocument();

    await user.click(screen.getByText('重試'));

    expect(retryLoad).toHaveBeenCalledTimes(1);
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
    expect(showToast).toHaveBeenCalledWith('success', '已匯出 Word 文件。');
  });

  it('shows an error toast and resets exporting state when the export fails', async () => {
    vi.mocked(exportToDocx).mockRejectedValue(new Error('export failed'));
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('export-trigger'));

    await waitFor(() => {
      expect(screen.getByText('exporting:false')).toBeInTheDocument();
    });
    expect(showToast).toHaveBeenCalledWith(
      'error',
      '匯出 Word 文件失敗，請稍後再試',
    );
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

  it('calls handleDeleteConnection with the right day and connection id', async () => {
    const handleDeleteConnection = vi.fn();
    vi.mocked(useConnectionActions).mockReturnValue(
      makeConnectionActions({ handleDeleteConnection }),
    );
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('delete-connection-0'));

    expect(handleDeleteConnection).toHaveBeenCalledWith(0, 100);
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

    expect(handleSaveConnection).toHaveBeenCalledWith(
      0,
      {
        id: 100,
        fromAttractionId: 10,
        toAttractionId: 11,
        transportMode: 'walk',
      },
      undefined,
    );
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

    await user.click(screen.getByText('dialog-cancel'));
    expect(cancelLeave).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('dialog-confirm'));
    expect(confirmLeave).toHaveBeenCalledTimes(1);
  });

  it('opens the edit trip modal from the header edit trigger', async () => {
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('edit-trip-trigger'));

    expect(screen.getByText('edit-trip-modal')).toBeInTheDocument();
    expect(screen.getByText('editing:Trip A')).toBeInTheDocument();
  });

  it('closes the edit trip modal without touching the loaded trip', async () => {
    const user = userEvent.setup();
    renderTripDetail();
    await user.click(screen.getByText('edit-trip-trigger'));

    await user.click(screen.getByText('close-edit-trip-modal'));

    expect(screen.queryByText('edit-trip-modal')).not.toBeInTheDocument();
  });

  it('closes any open attraction/connection modal when opening the edit trip modal', async () => {
    const user = userEvent.setup();
    renderTripDetail();
    await user.click(screen.getByText('add-attraction-0'));
    expect(screen.getByText('attraction-modal')).toBeInTheDocument();

    await user.click(screen.getByText('edit-trip-trigger'));

    expect(screen.queryByText('attraction-modal')).not.toBeInTheDocument();
    expect(screen.getByText('edit-trip-modal')).toBeInTheDocument();
  });

  it('applies the updated trip and closes the modal when the edit trip modal saves', async () => {
    const setTrip = vi.fn();
    vi.mocked(useTripData).mockReturnValue(makeTripData({ setTrip }));
    const user = userEvent.setup();
    renderTripDetail();
    await user.click(screen.getByText('edit-trip-trigger'));

    await user.click(screen.getByText('save-edit-trip-modal'));

    expect(setTrip).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, title: 'Updated Trip' }),
    );
    expect(screen.queryByText('edit-trip-modal')).not.toBeInTheDocument();
  });

  it('reloads content when the edit trip modal reports removed day lanes', async () => {
    const reloadContent = vi.fn();
    vi.mocked(useTripData).mockReturnValue(makeTripData({ reloadContent }));
    const user = userEvent.setup();
    renderTripDetail();
    await user.click(screen.getByText('edit-trip-trigger'));

    await user.click(screen.getByText('content-changed-trigger'));

    expect(reloadContent).toHaveBeenCalledTimes(1);
  });

  it('opens the edit day note modal for the clicked day', async () => {
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('edit-day-note-1'));

    expect(screen.getByText('edit-day-note-modal')).toBeInTheDocument();
    expect(screen.getByText('editing-day-2')).toBeInTheDocument();
  });

  it('closes the edit day note modal and reloads content via its onClose trigger', async () => {
    const reloadContent = vi.fn();
    vi.mocked(useTripData).mockReturnValue(makeTripData({ reloadContent }));
    const user = userEvent.setup();
    renderTripDetail();
    await user.click(screen.getByText('edit-day-note-0'));

    await user.click(screen.getByText('close-edit-day-note-modal'));

    expect(screen.queryByText('edit-day-note-modal')).not.toBeInTheDocument();
    expect(reloadContent).toHaveBeenCalledTimes(1);
  });

  it('calls handleSaveDayNotes with the right day index and notes on save', async () => {
    const handleSaveDayNotes = vi.fn();
    vi.mocked(useDayNoteActions).mockReturnValue(
      makeDayNoteActions({ handleSaveDayNotes }),
    );
    const user = userEvent.setup();
    renderTripDetail();
    await user.click(screen.getByText('edit-day-note-1'));

    await user.click(screen.getByText('save-edit-day-note-modal'));

    expect(handleSaveDayNotes).toHaveBeenCalledWith(1, 'New notes');
  });

  it('does not render the move confirm dialog when showMoveConfirm is false', () => {
    renderTripDetail();

    expect(
      screen.queryByText('確定要移動這張卡片嗎？'),
    ).not.toBeInTheDocument();
  });

  it('renders the move confirm dialog and wires cancel/confirm when showMoveConfirm is true', async () => {
    const cancelMove = vi.fn();
    const confirmMove = vi.fn();
    vi.mocked(useDragAndDrop).mockReturnValue(
      makeDnd({ showMoveConfirm: true, cancelMove, confirmMove }),
    );
    const user = userEvent.setup();
    renderTripDetail();

    expect(screen.getByText('確定要移動這張卡片嗎？')).toBeInTheDocument();

    await user.click(screen.getByText('dialog-cancel'));
    expect(cancelMove).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('dialog-confirm'));
    expect(confirmMove).toHaveBeenCalledTimes(1);
  });
});
