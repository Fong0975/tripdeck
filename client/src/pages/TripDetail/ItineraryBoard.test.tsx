import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { makeAttraction, makeBoardDays } from '@/test-utils/fixtures';

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

vi.mock('@/components/DayColumn', async () => ({
  default: (await import('@/test-utils/stubs')).DayColumnStub,
}));

function renderBoard(
  overrides: Partial<Parameters<typeof ItineraryBoard>[0]> = {},
) {
  const props: Parameters<typeof ItineraryBoard>[0] = {
    days: makeBoardDays(),
    sensors: [],
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    activeAttractionId: null,
    getActiveAttraction: vi.fn(() => undefined),
    onEditDayNote: vi.fn(),
    onOpenDayMap: vi.fn(),
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
  return { props };
}

describe('ItineraryBoard', () => {
  it('renders one day column per day', () => {
    renderBoard();

    expect(screen.getByText('day-column-0')).toBeInTheDocument();
    expect(screen.getByText('day-column-1')).toBeInTheDocument();
  });

  it('forwards every day column callback with the day index and its arguments', async () => {
    const user = userEvent.setup();
    const { props } = renderBoard();

    await user.click(screen.getByText('edit-day-note-1'));
    await user.click(screen.getByText('open-day-map-1'));
    await user.click(screen.getByText('add-attraction-1'));
    await user.click(screen.getByText('edit-attraction-0'));
    await user.click(screen.getByText('delete-attraction-0'));
    await user.click(screen.getByText('duplicate-attraction-0'));
    await user.click(screen.getByText('edit-connection-0'));
    await user.click(screen.getByText('delete-connection-0'));
    await user.click(screen.getByText('add-connection-0'));
    await user.click(screen.getByText('add-location-0'));
    await user.click(screen.getByText('update-location-0'));
    await user.click(screen.getByText('delete-location-0'));

    expect(props.onEditDayNote).toHaveBeenCalledWith(1);
    expect(props.onOpenDayMap).toHaveBeenCalledWith(1);
    expect(props.onAddAttraction).toHaveBeenCalledWith(1);
    expect(props.onEditAttraction).toHaveBeenCalledWith(0, {
      id: 10,
      name: 'Attraction A',
    });
    expect(props.onDeleteAttraction).toHaveBeenCalledWith(0, 10);
    expect(props.onDuplicateAttraction).toHaveBeenCalledWith(0, {
      id: 10,
      name: 'Attraction A',
    });
    expect(props.onEditConnection).toHaveBeenCalledWith(0, {
      id: 100,
      fromAttractionId: 10,
      toAttractionId: 11,
      transportMode: 'walk',
    });
    expect(props.onDeleteConnection).toHaveBeenCalledWith(0, 100);
    expect(props.onAddConnection).toHaveBeenCalledWith(0, 10, 11);
    expect(props.onAddLocation).toHaveBeenCalledWith(0, 'New Location');
    expect(props.onUpdateLocation).toHaveBeenCalledWith(
      0,
      50,
      'Updated Location',
    );
    expect(props.onDeleteLocation).toHaveBeenCalledWith(0, 50);
  });

  it('does not render the drag overlay attraction card when no drag is active', () => {
    renderBoard();

    expect(screen.queryByText('attraction-card')).not.toBeInTheDocument();
  });

  it('renders the drag overlay attraction card when a drag is active', () => {
    renderBoard({
      activeAttractionId: 10,
      getActiveAttraction: vi.fn(() =>
        makeAttraction({ id: 10, name: 'Attraction A' }),
      ),
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
