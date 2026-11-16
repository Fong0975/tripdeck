import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  makeAttraction,
  makeBoardDays,
  makeConnection,
  makeContent,
  makeTrip,
} from '@/test-utils/fixtures';
import type {
  Attraction,
  AttractionDraft,
  DayPlan,
  Trip,
  TravelConnection,
} from '@/types';
import {
  DEFAULT_EXPORT_OPTIONS,
  type ExportOptions,
} from '@/utils/exportToDocx/exportOptions';

import TripModals from './TripModals';
import type { ModalState } from './types';

vi.mock('@/components/AttractionModal', () => ({
  default: ({
    tripId,
    attraction,
    onClose,
    onSave,
    onImagesChanged,
  }: {
    tripId?: number;
    attraction?: Attraction;
    onClose: () => void;
    onSave: (
      attraction: AttractionDraft,
      stagedImages?: { file: File; title: string }[],
    ) => Promise<void> | void;
    onImagesChanged?: () => void;
  }) => (
    <div>
      <span>attraction-modal-trip-{tripId}</span>
      <span>{attraction ? `editing-${attraction.id}` : 'creating'}</span>
      <button onClick={onClose}>modal-close</button>
      <button onClick={() => onSave(attraction ?? { id: 0, name: 'New' })}>
        modal-save
      </button>
      <button onClick={() => onImagesChanged?.()}>modal-images-changed</button>
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
    onImagesChanged,
  }: {
    tripId?: number;
    connection: TravelConnection;
    fromName: string;
    toName: string;
    onClose: () => void;
    onSave: (connection: TravelConnection) => Promise<void> | void;
    onImagesChanged?: () => void;
  }) => (
    <div>
      <span>connection-modal</span>
      <span>
        {fromName} to {toName}
      </span>
      <button onClick={onClose}>modal-close</button>
      <button onClick={() => onSave(connection)}>modal-save</button>
      <button onClick={() => onImagesChanged?.()}>modal-images-changed</button>
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
    onSave: (notes: string | null) => Promise<void> | void;
  }) => (
    <div>
      <span>edit-day-note-modal</span>
      <span>editing-day-{day.id}</span>
      <button onClick={onClose}>modal-close</button>
      <button onClick={() => onSave('New notes')}>modal-save</button>
    </div>
  ),
}));

vi.mock('@/components/DayMapModal', () => ({
  default: ({
    tripId,
    days,
    initialDayIndex,
    onClose,
  }: {
    tripId: number;
    days: DayPlan[];
    initialDayIndex: number;
    onClose: () => void;
  }) => (
    <div>
      <span>day-map-modal</span>
      <span>map-trip-{tripId}</span>
      <span>
        map-opened-on-day-{days[initialDayIndex].id}-of-{days.length}
      </span>
      <button onClick={onClose}>modal-close</button>
    </div>
  ),
}));

vi.mock('@/components/TripTimelineModal', () => ({
  default: ({ days, onClose }: { days: DayPlan[]; onClose: () => void }) => (
    <div>
      <span>timeline-modal</span>
      <span>timeline-days-{days.length}</span>
      <button onClick={onClose}>modal-close</button>
    </div>
  ),
}));

vi.mock('@/components/ExportOptionsModal', () => ({
  default: ({
    onClose,
    onConfirm,
  }: {
    onClose: () => void;
    onConfirm: (options: ExportOptions) => void;
  }) => (
    <div>
      <span>export-options-modal</span>
      <button onClick={onClose}>modal-close</button>
      <button onClick={() => onConfirm(DEFAULT_EXPORT_OPTIONS)}>
        modal-confirm
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
    onImagesChanged,
  }: {
    trip: Trip;
    onClose: () => void;
    onUpdated: (trip: Trip) => void;
    onContentChanged?: () => void;
    onImagesChanged?: () => void;
  }) => (
    <div>
      <span>edit-trip-modal</span>
      <span>editing:{trip.title}</span>
      <button onClick={onClose}>modal-close</button>
      <button onClick={() => onUpdated({ ...trip, title: 'Updated Trip' })}>
        modal-save
      </button>
      <button onClick={() => onContentChanged?.()}>
        modal-content-changed
      </button>
      <button onClick={() => onImagesChanged?.()}>modal-images-changed</button>
    </div>
  ),
}));

const trip = makeTrip({ title: 'Trip A' });
const attraction = makeAttraction({ id: 10, name: 'Attraction A' });
const connection = makeConnection({
  id: 100,
  fromAttractionId: 10,
  toAttractionId: 11,
  transportMode: 'walk',
});

function renderModals(
  modal: ModalState,
  overrides: Partial<ComponentProps<typeof TripModals>> = {},
) {
  const props: ComponentProps<typeof TripModals> = {
    trip,
    content: makeContent(makeBoardDays()),
    modal,
    onClose: vi.fn(),
    onSaveAttraction: vi.fn(() => Promise.resolve()),
    onSaveConnection: vi.fn(() => Promise.resolve()),
    onSaveDayNotes: vi.fn(() => Promise.resolve()),
    onConfirmExport: vi.fn(),
    onTripUpdated: vi.fn(),
    reloadContent: vi.fn(() => Promise.resolve()),
    reloadTrip: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
  render(<TripModals {...props} />);
  return { props };
}

describe('TripModals', () => {
  it('renders nothing when no modal is open', () => {
    renderModals({ type: 'none' });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each<{ modal: ModalState; texts: string[] }>([
    {
      modal: { type: 'addAttraction', dayIndex: 1 },
      texts: ['attraction-modal-trip-1', 'creating'],
    },
    {
      modal: { type: 'editAttraction', dayIndex: 0, attraction },
      texts: ['attraction-modal-trip-1', 'editing-10'],
    },
    {
      modal: { type: 'editConnection', dayIndex: 0, connection },
      texts: ['connection-modal', 'Attraction A to Attraction B'],
    },
    {
      modal: { type: 'editDayNote', dayIndex: 1 },
      texts: ['edit-day-note-modal', 'editing-day-2'],
    },
    {
      modal: { type: 'dayMap', dayIndex: 1 },
      texts: ['day-map-modal', 'map-trip-1', 'map-opened-on-day-2-of-2'],
    },
    {
      modal: { type: 'timeline' },
      texts: ['timeline-modal', 'timeline-days-2'],
    },
    {
      modal: { type: 'export' },
      texts: ['export-options-modal'],
    },
    {
      modal: { type: 'editTrip' },
      texts: ['edit-trip-modal', 'editing:Trip A'],
    },
  ])('renders the right modal for $modal.type', ({ modal, texts }) => {
    renderModals(modal);

    texts.forEach(text => expect(screen.getByText(text)).toBeInTheDocument());
  });

  it('falls back to empty names when the connection references unknown attractions', () => {
    renderModals({
      type: 'editConnection',
      dayIndex: 0,
      connection: makeConnection({
        id: 100,
        fromAttractionId: 999,
        toAttractionId: 998,
      }),
    });

    expect(screen.getByText('to')).toBeInTheDocument();
  });

  it.each<{
    name: string;
    modal: ModalState;
    handler: 'onSaveAttraction' | 'onSaveConnection' | 'onSaveDayNotes';
    args: unknown[];
  }>([
    {
      name: 'a new attraction',
      modal: { type: 'addAttraction', dayIndex: 1 },
      handler: 'onSaveAttraction',
      args: [1, { id: 0, name: 'New' }, undefined],
    },
    {
      name: 'an edited attraction',
      modal: { type: 'editAttraction', dayIndex: 0, attraction },
      handler: 'onSaveAttraction',
      args: [0, attraction],
    },
    {
      name: 'a connection',
      modal: { type: 'editConnection', dayIndex: 0, connection },
      handler: 'onSaveConnection',
      args: [0, connection, undefined],
    },
    {
      name: 'day notes',
      modal: { type: 'editDayNote', dayIndex: 1 },
      handler: 'onSaveDayNotes',
      args: [1, 'New notes'],
    },
  ])('saves $name for the right day', async ({ modal, handler, args }) => {
    const user = userEvent.setup();
    const { props } = renderModals(modal);

    await user.click(screen.getByText('modal-save'));

    expect(props[handler]).toHaveBeenCalledWith(...args);
  });

  it.each<{ modal: ModalState; reloadsContent: boolean }>([
    { modal: { type: 'addAttraction', dayIndex: 0 }, reloadsContent: false },
    {
      modal: { type: 'editAttraction', dayIndex: 0, attraction },
      reloadsContent: false,
    },
    {
      modal: { type: 'editConnection', dayIndex: 0, connection },
      reloadsContent: false,
    },
    { modal: { type: 'editDayNote', dayIndex: 0 }, reloadsContent: true },
    { modal: { type: 'dayMap', dayIndex: 0 }, reloadsContent: false },
    { modal: { type: 'timeline' }, reloadsContent: false },
    { modal: { type: 'export' }, reloadsContent: false },
    { modal: { type: 'editTrip' }, reloadsContent: false },
  ])(
    'closes the $modal.type modal (reloading content: $reloadsContent)',
    async ({ modal, reloadsContent }) => {
      const user = userEvent.setup();
      const { props } = renderModals(modal);

      await user.click(screen.getByText('modal-close'));

      expect(props.onClose).toHaveBeenCalledTimes(1);
      expect(props.reloadContent).toHaveBeenCalledTimes(reloadsContent ? 1 : 0);
    },
  );

  it.each<{ modal: ModalState; trigger: string; expected: 'content' | 'trip' }>(
    [
      {
        modal: { type: 'addAttraction', dayIndex: 0 },
        trigger: 'modal-images-changed',
        expected: 'content',
      },
      {
        modal: { type: 'editAttraction', dayIndex: 0, attraction },
        trigger: 'modal-images-changed',
        expected: 'content',
      },
      {
        modal: { type: 'editConnection', dayIndex: 0, connection },
        trigger: 'modal-images-changed',
        expected: 'content',
      },
      {
        modal: { type: 'editTrip' },
        trigger: 'modal-content-changed',
        expected: 'content',
      },
      {
        modal: { type: 'editTrip' },
        trigger: 'modal-images-changed',
        expected: 'trip',
      },
    ],
  )(
    'reloads the $expected when the $modal.type modal fires $trigger',
    async ({ modal, trigger, expected }) => {
      const user = userEvent.setup();
      const { props } = renderModals(modal);

      await user.click(screen.getByText(trigger));

      expect(props.reloadContent).toHaveBeenCalledTimes(
        expected === 'content' ? 1 : 0,
      );
      expect(props.reloadTrip).toHaveBeenCalledTimes(
        expected === 'trip' ? 1 : 0,
      );
      expect(props.onClose).not.toHaveBeenCalled();
    },
  );

  it('passes the chosen export options on when the export modal confirms', async () => {
    const user = userEvent.setup();
    const { props } = renderModals({ type: 'export' });

    await user.click(screen.getByText('modal-confirm'));

    expect(props.onConfirmExport).toHaveBeenCalledWith(DEFAULT_EXPORT_OPTIONS);
  });

  it('applies the updated trip and closes when the edit trip modal saves', async () => {
    const user = userEvent.setup();
    const { props } = renderModals({ type: 'editTrip' });

    await user.click(screen.getByText('modal-save'));

    expect(props.onTripUpdated).toHaveBeenCalledWith({
      ...trip,
      title: 'Updated Trip',
    });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
