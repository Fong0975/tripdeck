import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Attraction, DayPlan, TravelConnection } from '@/types';

import ItineraryBoard from './ItineraryBoard';

// `sensors: []` in renderBoard() means no real drag can ever begin, which
// would otherwise leave `@dnd-kit/core`'s real `DragOverlay` permanently
// gated behind its own internal (untestable-without-a-real-drag) active
// state. Only `DragOverlay` is stubbed so the component's own
// `activeAttractionId` conditional can be exercised directly.
vi.mock('@dnd-kit/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DragOverlay: ({ children }: { children: ReactNode }) => children,
  };
});

vi.mock('@/components/AttractionCard', () => ({
  default: () => <div>attraction-card</div>,
}));

vi.mock('@/components/DayColumn', () => ({
  default: ({
    day,
    dayIndex,
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
    day: DayPlan;
    dayIndex: number;
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
      <span>day-column-{dayIndex}</span>
      <button onClick={() => onEditDayNote(dayIndex)}>
        edit-day-note-{dayIndex}
      </button>
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
      {day.connections[0] && (
        <button
          onClick={() => onDeleteConnection(dayIndex, day.connections[0].id)}
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
  ),
}));

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

function renderBoard(
  overrides: Partial<Parameters<typeof ItineraryBoard>[0]> = {},
) {
  const props: Parameters<typeof ItineraryBoard>[0] = {
    days: makeDays(),
    sensors: [],
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    activeAttractionId: null,
    getActiveAttraction: vi.fn(() => undefined),
    onEditDayNote: vi.fn(),
    onAddAttraction: vi.fn(),
    onEditAttraction: vi.fn(),
    onDeleteAttraction: vi.fn(),
    onDuplicateAttraction: vi.fn(),
    onEditConnection: vi.fn(),
    onDeleteConnection: vi.fn(),
    onAddConnection: vi.fn(),
    onAddLocation: vi.fn(),
    onUpdateLocation: vi.fn(),
    onDeleteLocation: vi.fn(),
    ...overrides,
  };
  render(<ItineraryBoard {...props} />);
  return props;
}

describe('ItineraryBoard', () => {
  it('renders one day column per day', () => {
    renderBoard();

    expect(screen.getByText('day-column-0')).toBeInTheDocument();
    expect(screen.getByText('day-column-1')).toBeInTheDocument();
  });

  it('calls onEditDayNote with the clicked day index', async () => {
    const user = userEvent.setup();
    const onEditDayNote = vi.fn();
    renderBoard({ onEditDayNote });

    await user.click(screen.getByText('edit-day-note-1'));

    expect(onEditDayNote).toHaveBeenCalledWith(1);
  });

  it('calls onAddAttraction with the clicked day index', async () => {
    const user = userEvent.setup();
    const onAddAttraction = vi.fn();
    renderBoard({ onAddAttraction });

    await user.click(screen.getByText('add-attraction-1'));

    expect(onAddAttraction).toHaveBeenCalledWith(1);
  });

  it('calls onEditAttraction with the day index and attraction', async () => {
    const user = userEvent.setup();
    const onEditAttraction = vi.fn();
    renderBoard({ onEditAttraction });

    await user.click(screen.getByText('edit-attraction-0'));

    expect(onEditAttraction).toHaveBeenCalledWith(0, {
      id: 10,
      name: 'Attraction A',
    });
  });

  it('calls onDeleteAttraction with the day index and attraction id', async () => {
    const user = userEvent.setup();
    const onDeleteAttraction = vi.fn();
    renderBoard({ onDeleteAttraction });

    await user.click(screen.getByText('delete-attraction-0'));

    expect(onDeleteAttraction).toHaveBeenCalledWith(0, 10);
  });

  it('calls onDuplicateAttraction with the day index and attraction', async () => {
    const user = userEvent.setup();
    const onDuplicateAttraction = vi.fn();
    renderBoard({ onDuplicateAttraction });

    await user.click(screen.getByText('duplicate-attraction-0'));

    expect(onDuplicateAttraction).toHaveBeenCalledWith(0, {
      id: 10,
      name: 'Attraction A',
    });
  });

  it('calls onEditConnection with the day index and connection', async () => {
    const user = userEvent.setup();
    const onEditConnection = vi.fn();
    renderBoard({ onEditConnection });

    await user.click(screen.getByText('edit-connection-0'));

    expect(onEditConnection).toHaveBeenCalledWith(0, {
      id: 100,
      fromAttractionId: 10,
      toAttractionId: 11,
      transportMode: 'walk',
    });
  });

  it('calls onDeleteConnection with the day index and connection id', async () => {
    const user = userEvent.setup();
    const onDeleteConnection = vi.fn();
    renderBoard({ onDeleteConnection });

    await user.click(screen.getByText('delete-connection-0'));

    expect(onDeleteConnection).toHaveBeenCalledWith(0, 100);
  });

  it('calls onAddConnection with the day index and attraction ids', async () => {
    const user = userEvent.setup();
    const onAddConnection = vi.fn();
    renderBoard({ onAddConnection });

    await user.click(screen.getByText('add-connection-0'));

    expect(onAddConnection).toHaveBeenCalledWith(0, 10, 11);
  });

  it('calls onAddLocation with the day index and name', async () => {
    const user = userEvent.setup();
    const onAddLocation = vi.fn();
    renderBoard({ onAddLocation });

    await user.click(screen.getByText('add-location-0'));

    expect(onAddLocation).toHaveBeenCalledWith(0, 'New Location');
  });

  it('calls onUpdateLocation with the day index, location id and name', async () => {
    const user = userEvent.setup();
    const onUpdateLocation = vi.fn();
    renderBoard({ onUpdateLocation });

    await user.click(screen.getByText('update-location-0'));

    expect(onUpdateLocation).toHaveBeenCalledWith(0, 50, 'Updated Location');
  });

  it('calls onDeleteLocation with the day index and location id', async () => {
    const user = userEvent.setup();
    const onDeleteLocation = vi.fn();
    renderBoard({ onDeleteLocation });

    await user.click(screen.getByText('delete-location-0'));

    expect(onDeleteLocation).toHaveBeenCalledWith(0, 50);
  });

  it('does not render the drag overlay attraction card when no drag is active', () => {
    renderBoard();

    expect(screen.queryByText('attraction-card')).not.toBeInTheDocument();
  });

  it('renders the drag overlay attraction card when a drag is active', () => {
    renderBoard({
      activeAttractionId: 10,
      getActiveAttraction: vi.fn(() => ({ id: 10, name: 'Attraction A' })),
    });

    expect(screen.getByText('attraction-card')).toBeInTheDocument();
  });

  it('does not render the drag overlay when the active attraction cannot be found', () => {
    renderBoard({
      activeAttractionId: 999,
      getActiveAttraction: vi.fn(() => undefined),
    });

    expect(screen.queryByText('attraction-card')).not.toBeInTheDocument();
  });
});
