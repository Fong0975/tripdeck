import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import {
  makeAttraction,
  makeBoardDays,
  makeConnection,
  makeContent,
  makeTrip,
} from '@/test-utils/fixtures';
import type { Trip } from '@/types';

import TripModals from './TripModals';
import type { ModalState } from './types';
import { useAttractionActions } from './useAttractionActions';
import { useConnectionActions } from './useConnectionActions';
import { useDayLocationActions } from './useDayLocationActions';
import { useDayNoteActions } from './useDayNoteActions';
import { useDragAndDrop } from './useDragAndDrop';
import { useTripData } from './useTripData';
import { useTripExport } from './useTripExport';

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
vi.mock('./useTripExport', () => ({ useTripExport: vi.fn() }));

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
// context. TripModals (see TripModals.test.tsx) is a bare mock whose
// received props are inspected directly.
vi.mock('./ItineraryBoard', async () => ({
  default: (await import('@/test-utils/stubs')).ItineraryBoardStub,
}));

vi.mock('./TripModals', () => ({ default: vi.fn(() => null) }));

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
      <button onClick={onCancel}>dialog-cancel</button>
      <button onClick={onConfirm}>dialog-confirm</button>
    </div>
  ),
}));

function makeBoardTrip(): Trip {
  return makeTrip({
    title: 'Trip A',
    destination: 'Tokyo',
    endDate: '2026-01-02',
  });
}

function makeTripData(
  overrides: Partial<ReturnType<typeof useTripData>> = {},
): ReturnType<typeof useTripData> {
  return {
    trip: makeBoardTrip(),
    content: makeContent(makeBoardDays()),
    reloadContent: vi.fn(),
    reloadTrip: vi.fn(),
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

/** Props TripModals received on the latest render. */
function lastModalsProps() {
  const call = vi.mocked(TripModals).mock.lastCall;
  if (!call) {
    throw new Error('TripModals was never rendered');
  }
  return call[0];
}

beforeEach(() => {
  vi.mocked(useTripData).mockReturnValue(makeTripData());
  vi.mocked(useAttractionActions).mockReturnValue(makeAttractionActions());
  vi.mocked(useConnectionActions).mockReturnValue(makeConnectionActions());
  vi.mocked(useDayLocationActions).mockReturnValue(makeDayLocationActions());
  vi.mocked(useDayNoteActions).mockReturnValue(makeDayNoteActions());
  vi.mocked(useDragAndDrop).mockReturnValue(makeDnd());
  vi.mocked(useUnsavedChangesGuard).mockReturnValue(makeGuard());
  vi.mocked(useTripExport).mockReturnValue({
    exporting: false,
    handleExport: vi.fn(),
  });
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
    expect(screen.queryByText('確定要離開嗎？')).not.toBeInTheDocument();
    expect(
      screen.queryByText('確定要移動這張卡片嗎？'),
    ).not.toBeInTheDocument();
    expect(lastModalsProps().modal).toEqual({ type: 'none' });
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

  it.each([
    {
      description: 'switches without confirmation when the checklist is clean',
      markDirty: false,
      resolve: null,
      expectConfirm: false,
      expectChecklist: false,
    },
    {
      description: 'stays on the checklist when discarding is cancelled',
      markDirty: true,
      resolve: 'dialog-cancel',
      expectConfirm: true,
      expectChecklist: true,
    },
    {
      description: 'switches once discarding is confirmed',
      markDirty: true,
      resolve: 'dialog-confirm',
      expectConfirm: true,
      expectChecklist: false,
    },
  ])(
    'leaving the checklist tab $description',
    async ({ markDirty, resolve, expectConfirm, expectChecklist }) => {
      const user = userEvent.setup();
      renderTripDetail();
      await user.click(screen.getByText('行李清單'));
      if (markDirty) {
        await user.click(screen.getByText('mark-dirty'));
      }

      await user.click(screen.getByText('行程規劃'));

      expect(screen.queryByText('確定要切換分頁嗎？') !== null).toBe(
        expectConfirm,
      );
      if (resolve) {
        await user.click(screen.getByText(resolve));
        expect(
          screen.queryByText('確定要切換分頁嗎？'),
        ).not.toBeInTheDocument();
      }
      expect(screen.queryByText('trip-checklist-panel-1') !== null).toBe(
        expectChecklist,
      );
      expect(screen.queryByText('day-column-0') !== null).toBe(
        !expectChecklist,
      );
    },
  );

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

  it('wires the trip export hook to the header', async () => {
    const handleExport = vi.fn();
    vi.mocked(useTripExport).mockReturnValue({
      exporting: true,
      handleExport,
    });
    const trip = makeBoardTrip();
    const content = makeContent(makeBoardDays());
    vi.mocked(useTripData).mockReturnValue(makeTripData({ trip, content }));
    const user = userEvent.setup();
    renderTripDetail();

    expect(useTripExport).toHaveBeenCalledWith(trip, content);
    expect(screen.getByText('exporting:true')).toBeInTheDocument();

    await user.click(screen.getByText('export-trigger'));

    expect(handleExport).toHaveBeenCalledTimes(1);
  });

  it.each<{ trigger: string; modal: ModalState }>([
    {
      trigger: 'add-attraction-1',
      modal: { type: 'addAttraction', dayIndex: 1 },
    },
    {
      trigger: 'edit-attraction-0',
      modal: {
        type: 'editAttraction',
        dayIndex: 0,
        attraction: makeAttraction({ id: 10, name: 'Attraction A' }),
      },
    },
    {
      trigger: 'edit-connection-0',
      modal: {
        type: 'editConnection',
        dayIndex: 0,
        connection: makeConnection({
          id: 100,
          fromAttractionId: 10,
          toAttractionId: 11,
        }),
      },
    },
    {
      trigger: 'edit-day-note-1',
      modal: { type: 'editDayNote', dayIndex: 1 },
    },
    { trigger: 'open-day-map-1', modal: { type: 'dayMap', dayIndex: 1 } },
    { trigger: 'edit-trip-trigger', modal: { type: 'editTrip' } },
  ])(
    'opens the $modal.type modal from $trigger and closes it via onClose',
    async ({ trigger, modal }) => {
      const user = userEvent.setup();
      renderTripDetail();

      await user.click(screen.getByText(trigger));

      expect(lastModalsProps().modal).toEqual(modal);

      act(() => lastModalsProps().onClose());

      expect(lastModalsProps().modal).toEqual({ type: 'none' });
    },
  );

  it('replaces an open board modal when opening the edit trip modal', async () => {
    const user = userEvent.setup();
    renderTripDetail();
    await user.click(screen.getByText('add-attraction-0'));

    await user.click(screen.getByText('edit-trip-trigger'));

    expect(lastModalsProps().modal).toEqual({ type: 'editTrip' });
  });

  it('opens the connection modal when the openConnectionModal callback passed to useConnectionActions fires', () => {
    renderTripDetail();

    const calls = vi.mocked(useConnectionActions).mock.calls;
    const openConnectionModal = calls[calls.length - 1][4];
    const connection = makeConnection({
      id: 0,
      fromAttractionId: 10,
      toAttractionId: 11,
      transportMode: 'transit',
    });

    act(() => {
      openConnectionModal(0, connection);
    });

    expect(lastModalsProps().modal).toEqual({
      type: 'editConnection',
      dayIndex: 0,
      connection,
    });
  });

  it('passes the save handlers and reload callbacks to TripModals', () => {
    const tripData = makeTripData();
    const attractionActions = makeAttractionActions();
    const connectionActions = makeConnectionActions();
    const dayNoteActions = makeDayNoteActions();
    vi.mocked(useTripData).mockReturnValue(tripData);
    vi.mocked(useAttractionActions).mockReturnValue(attractionActions);
    vi.mocked(useConnectionActions).mockReturnValue(connectionActions);
    vi.mocked(useDayNoteActions).mockReturnValue(dayNoteActions);

    renderTripDetail();

    expect(lastModalsProps()).toMatchObject({
      trip: tripData.trip,
      content: tripData.content,
      onSaveAttraction: attractionActions.handleSaveAttraction,
      onSaveConnection: connectionActions.handleSaveConnection,
      onSaveDayNotes: dayNoteActions.handleSaveDayNotes,
      onTripUpdated: tripData.setTrip,
      reloadContent: tripData.reloadContent,
      reloadTrip: tripData.reloadTrip,
    });
  });

  it('forwards board callbacks to the attraction, connection and location action handlers with the right args', async () => {
    const handleDeleteAttraction = vi.fn();
    const handleDuplicateAttraction = vi.fn();
    const handleAddConnection = vi.fn();
    const handleDeleteConnection = vi.fn();
    const handleAddLocation = vi.fn();
    const handleUpdateLocation = vi.fn();
    const handleDeleteLocation = vi.fn();
    vi.mocked(useAttractionActions).mockReturnValue(
      makeAttractionActions({
        handleDeleteAttraction,
        handleDuplicateAttraction,
      }),
    );
    vi.mocked(useConnectionActions).mockReturnValue(
      makeConnectionActions({ handleAddConnection, handleDeleteConnection }),
    );
    vi.mocked(useDayLocationActions).mockReturnValue(
      makeDayLocationActions({
        handleAddLocation,
        handleUpdateLocation,
        handleDeleteLocation,
      }),
    );
    const user = userEvent.setup();
    renderTripDetail();

    await user.click(screen.getByText('delete-attraction-0'));
    await user.click(screen.getByText('duplicate-attraction-0'));
    await user.click(screen.getByText('add-connection-0'));
    await user.click(screen.getByText('delete-connection-0'));
    await user.click(screen.getByText('add-location-0'));
    await user.click(screen.getByText('update-location-0'));
    await user.click(screen.getByText('delete-location-0'));

    expect(handleDeleteAttraction).toHaveBeenCalledWith(10);
    expect(handleDuplicateAttraction).toHaveBeenCalledWith(
      makeAttraction({ id: 10, name: 'Attraction A' }),
    );
    expect(handleAddConnection).toHaveBeenCalledWith(0, 10, 11);
    expect(handleDeleteConnection).toHaveBeenCalledWith(100);
    expect(handleAddLocation).toHaveBeenCalledWith(0, 'New Location');
    expect(handleUpdateLocation).toHaveBeenCalledWith(50, 'Updated Location');
    expect(handleDeleteLocation).toHaveBeenCalledWith(50);
  });

  it.each([
    {
      description: 'leave',
      title: '確定要離開嗎？',
      setup: (cancel: () => void, confirm: () => void) =>
        vi.mocked(useUnsavedChangesGuard).mockReturnValue(
          makeGuard({
            showLeaveConfirm: true,
            cancelLeave: cancel,
            confirmLeave: confirm,
          }),
        ),
    },
    {
      description: 'move',
      title: '確定要移動這張卡片嗎？',
      setup: (cancel: () => void, confirm: () => void) =>
        vi.mocked(useDragAndDrop).mockReturnValue(
          makeDnd({
            showMoveConfirm: true,
            cancelMove: cancel,
            confirmMove: confirm,
          }),
        ),
    },
  ])(
    'renders the $description confirm dialog and wires cancel/confirm',
    async ({ title, setup }) => {
      const cancel = vi.fn();
      const confirm = vi.fn();
      setup(cancel, confirm);
      const user = userEvent.setup();
      renderTripDetail();

      expect(screen.getByText(title)).toBeInTheDocument();

      await user.click(screen.getByText('dialog-cancel'));
      expect(cancel).toHaveBeenCalledTimes(1);

      await user.click(screen.getByText('dialog-confirm'));
      expect(confirm).toHaveBeenCalledTimes(1);
    },
  );
});
