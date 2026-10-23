import type { EditItem, EditSpec } from '@/components/checklist/shared/types';
import type { Attraction, DayPlan, TravelConnection } from '@/types';

/**
 * Stub components for `vi.mock` factories. Each renders one plain button per
 * callback prop (labelled `<action>-<id>`) that invokes it with fixed
 * arguments, so a parent's wiring can be tested without the real child.
 *
 * Usage:
 * ```ts
 * vi.mock('./X', async () => ({
 *   default: (await import('@/test-utils/stubs')).XStub,
 * }));
 * ```
 */

/** Per-day callbacks shared by `ItineraryBoard` and `DayColumn`. */
export interface DayCallbacks {
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
}

/**
 * Stub for `DayColumn`. Attraction triggers act on the day's first
 * attraction; connection triggers render only when the day has one.
 */
export function DayColumnStub({
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
}: DayCallbacks & { day: DayPlan; dayIndex: number }) {
  return (
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
  );
}

/**
 * Stub for `ItineraryBoard`: a flat list of {@link DayColumnStub}s, one per
 * day, without any drag-and-drop context.
 */
export function ItineraryBoardStub({
  days,
  ...callbacks
}: DayCallbacks & { days: DayPlan[] }) {
  return (
    <div>
      {days.map((day, dayIndex) => (
        <DayColumnStub
          key={day.id}
          day={day}
          dayIndex={dayIndex}
          {...callbacks}
        />
      ))}
    </div>
  );
}

/**
 * Stub for the checklist `EditableItemRow`. Spec triggers act on spec id 100.
 */
export function EditableItemRowStub({
  item,
  onUpdateItem,
  onDeleteItem,
  onAddSpec,
  onUpdateSpec,
  onDeleteSpec,
}: {
  item: EditItem;
  onUpdateItem: (itemId: number, fields: Partial<EditItem>) => void;
  onDeleteItem: (itemId: number) => void;
  onAddSpec: (itemId: number) => void;
  onUpdateSpec: (
    itemId: number,
    specId: number,
    fields: Partial<EditSpec>,
  ) => void;
  onDeleteSpec: (itemId: number, specId: number) => void;
}) {
  return (
    <div>
      <span>{item.name}</span>
      <button onClick={() => onUpdateItem(item.id, { name: 'Updated' })}>
        update-item-{item.id}
      </button>
      <button onClick={() => onDeleteItem(item.id)}>
        delete-item-{item.id}
      </button>
      <button onClick={() => onAddSpec(item.id)}>add-spec-{item.id}</button>
      <button
        onClick={() => onUpdateSpec(item.id, 100, { name: 'Updated Spec' })}
      >
        update-spec-{item.id}
      </button>
      <button onClick={() => onDeleteSpec(item.id, 100)}>
        delete-spec-{item.id}
      </button>
    </div>
  );
}
