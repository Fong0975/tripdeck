import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Attraction, DayPlan, TravelConnection } from '@/types';
import { isPastDate } from '@/utils/date';

import DayColumn from './index';

vi.mock('@/utils/date', () => ({ isPastDate: vi.fn() }));
vi.mock('@/utils/weatherApi', () => ({ isWeatherEnabled: true }));

vi.mock('../AttractionCard', () => ({
  default: ({
    attraction,
    onEdit,
    onDelete,
    onDuplicate,
  }: {
    attraction: Attraction;
    onEdit: (a: Attraction) => void;
    onDelete: (id: number) => void;
    onDuplicate: (a: Attraction) => void;
  }) => (
    <div>
      <span>attraction-{attraction.id}</span>
      <button onClick={() => onEdit(attraction)}>edit-{attraction.id}</button>
      <button onClick={() => onDelete(attraction.id)}>
        delete-{attraction.id}
      </button>
      <button onClick={() => onDuplicate(attraction)}>
        duplicate-{attraction.id}
      </button>
    </div>
  ),
}));

vi.mock('../DayWeather', () => ({
  default: () => <div>day-weather</div>,
}));

vi.mock('../TravelConnectionItem', () => ({
  default: ({
    connection,
    onEdit,
    onDelete,
  }: {
    connection: TravelConnection;
    onEdit: (c: TravelConnection) => void;
    onDelete: (id: number) => void;
  }) => (
    <div>
      <button onClick={() => onEdit(connection)}>
        connection-{connection.id}
      </button>
      <button onClick={() => onDelete(connection.id)}>
        delete-connection-{connection.id}
      </button>
    </div>
  ),
}));

vi.mock('./LocationChips', () => ({
  default: () => <div>location-chips</div>,
}));

function makeDay(overrides: Partial<DayPlan> = {}): DayPlan {
  return {
    id: 1,
    day: 1,
    date: '2026-08-20',
    locations: [],
    attractions: [],
    connections: [],
    ...overrides,
  };
}

function makeAttraction(id: number, name = `A${id}`): Attraction {
  return { id, name };
}

function makeCallbacks() {
  return {
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
  };
}

function setupColumn(day: DayPlan, dayIndex = 0, callbacks = makeCallbacks()) {
  render(
    <DndContext>
      <DayColumn day={day} dayIndex={dayIndex} {...callbacks} />
    </DndContext>,
  );
  return callbacks;
}

beforeEach(() => {
  vi.mocked(isPastDate).mockReturnValue(false);
});

describe('DayColumn', () => {
  it('renders the day number and the formatted date label', () => {
    const day = makeDay({ day: 5, date: '2026-08-20' });

    setupColumn(day);

    expect(screen.getByText('第 5 天')).toBeInTheDocument();
    const expectedLabel = format(parseISO('2026-08-20'), 'M/d (EEE)', {
      locale: zhTW,
    });
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it('falls back to the raw date string when it cannot be parsed', () => {
    const day = makeDay({ date: 'not-a-date' });

    setupColumn(day);

    expect(screen.getByText('not-a-date')).toBeInTheDocument();
  });

  it('renders each attraction', () => {
    const day = makeDay({
      attractions: [makeAttraction(1), makeAttraction(2)],
    });

    setupColumn(day);

    expect(screen.getByText('attraction-1')).toBeInTheDocument();
    expect(screen.getByText('attraction-2')).toBeInTheDocument();
  });

  it('renders the connection between two consecutive attractions when it exists', () => {
    const day = makeDay({
      attractions: [makeAttraction(1), makeAttraction(2)],
      connections: [
        {
          id: 5,
          fromAttractionId: 1,
          toAttractionId: 2,
          transportMode: 'walk',
        },
      ],
    });

    setupColumn(day);

    expect(screen.getByText('connection-5')).toBeInTheDocument();
    expect(screen.queryByText('+ 新增移動資訊')).not.toBeInTheDocument();
  });

  it('shows an add-connection button between two consecutive attractions with no connection', async () => {
    const day = makeDay({
      attractions: [makeAttraction(1), makeAttraction(2)],
    });
    const user = userEvent.setup();
    const callbacks = setupColumn(day, 2);

    await user.click(screen.getByText('+ 新增移動資訊'));

    expect(callbacks.onAddConnection).toHaveBeenCalledWith(2, 1, 2);
  });

  it('does not render a connector after the last attraction', () => {
    const day = makeDay({ attractions: [makeAttraction(1)] });

    setupColumn(day);

    expect(screen.queryByText('+ 新增移動資訊')).not.toBeInTheDocument();
    expect(screen.queryByText(/^connection-/)).not.toBeInTheDocument();
  });

  it('calls onAddAttraction with the dayIndex when the add button is clicked', async () => {
    const user = userEvent.setup();
    const callbacks = setupColumn(makeDay(), 4);

    await user.click(screen.getByText('新增景點'));

    expect(callbacks.onAddAttraction).toHaveBeenCalledWith(4);
  });

  it('wraps attraction card callbacks with the dayIndex', async () => {
    const day = makeDay({ attractions: [makeAttraction(1)] });
    const user = userEvent.setup();
    const callbacks = setupColumn(day, 2);

    await user.click(screen.getByText('edit-1'));
    await user.click(screen.getByText('delete-1'));
    await user.click(screen.getByText('duplicate-1'));

    expect(callbacks.onEditAttraction).toHaveBeenCalledWith(
      2,
      day.attractions[0],
    );
    expect(callbacks.onDeleteAttraction).toHaveBeenCalledWith(2, 1);
    expect(callbacks.onDuplicateAttraction).toHaveBeenCalledWith(
      2,
      day.attractions[0],
    );
  });

  it('wraps the connection edit callback with the dayIndex', async () => {
    const connection: TravelConnection = {
      id: 5,
      fromAttractionId: 1,
      toAttractionId: 2,
      transportMode: 'walk',
    };
    const day = makeDay({
      attractions: [makeAttraction(1), makeAttraction(2)],
      connections: [connection],
    });
    const user = userEvent.setup();
    const callbacks = setupColumn(day, 2);

    await user.click(screen.getByText('connection-5'));

    expect(callbacks.onEditConnection).toHaveBeenCalledWith(2, connection);
  });

  it('wraps the connection delete callback with the dayIndex', async () => {
    const connection: TravelConnection = {
      id: 5,
      fromAttractionId: 1,
      toAttractionId: 2,
      transportMode: 'walk',
    };
    const day = makeDay({
      attractions: [makeAttraction(1), makeAttraction(2)],
      connections: [connection],
    });
    const user = userEvent.setup();
    const callbacks = setupColumn(day, 2);

    await user.click(screen.getByText('delete-connection-5'));

    expect(callbacks.onDeleteConnection).toHaveBeenCalledWith(2, 5);
  });

  it('shows DayWeather when enabled, the day is not past, and locations exist', () => {
    vi.mocked(isPastDate).mockReturnValue(false);
    const day = makeDay({ locations: [{ id: 1, name: 'Tokyo' }] });

    setupColumn(day);

    expect(screen.getByText('day-weather')).toBeInTheDocument();
  });

  it.each([
    {
      description: 'the day is in the past',
      isPast: true,
      locations: [{ id: 1, name: 'Tokyo' }],
    },
    { description: 'there are no locations', isPast: false, locations: [] },
  ])('hides DayWeather when $description', ({ isPast, locations }) => {
    vi.mocked(isPastDate).mockReturnValue(isPast);
    const day = makeDay({ locations });

    setupColumn(day);

    expect(screen.queryByText('day-weather')).not.toBeInTheDocument();
  });

  it('always renders LocationChips', () => {
    setupColumn(makeDay());

    expect(screen.getByText('location-chips')).toBeInTheDocument();
  });
});
