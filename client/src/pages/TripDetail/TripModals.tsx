import AttractionModal from '@/components/AttractionModal';
import DayMapModal from '@/components/DayMapModal';
import EditDayNoteModal from '@/components/EditDayNoteModal';
import EditTripModal from '@/components/EditTripModal';
import TravelConnectionModal from '@/components/TravelConnectionModal';
import TripTimelineModal from '@/components/TripTimelineModal';
import type {
  AttractionDraft,
  DayPlan,
  TravelConnection,
  Trip,
  TripContent,
} from '@/types';
import type { StagedImage } from '@/utils/stagedImages';

import type { ModalState } from './types';

interface Props {
  trip: Trip;
  content: TripContent;
  modal: ModalState;
  onClose: () => void;
  onSaveAttraction: (
    dayIndex: number,
    attraction: AttractionDraft,
    stagedImages?: StagedImage[],
  ) => Promise<void>;
  onSaveConnection: (
    dayIndex: number,
    connection: TravelConnection,
    stagedImages?: StagedImage[],
  ) => Promise<void>;
  onSaveDayNotes: (dayIndex: number, notes: string | null) => Promise<void>;
  onTripUpdated: (trip: Trip) => void;
  reloadContent: () => Promise<void>;
  reloadTrip: () => Promise<void>;
}

/** Looks up an attraction's name within a day, or '' when it is missing. */
function attractionName(day: DayPlan, attractionId: number): string {
  return day.attractions.find(a => a.id === attractionId)?.name ?? '';
}

/**
 * Renders the trip detail page's active modal (if any) for the given
 * `ModalState`, wiring each modal's save callback (returned as a Promise so
 * the modal can await it) and image/content change notifications back to
 * the page's reloads.
 */
export default function TripModals({
  trip,
  content,
  modal,
  onClose,
  onSaveAttraction,
  onSaveConnection,
  onSaveDayNotes,
  onTripUpdated,
  reloadContent,
  reloadTrip,
}: Props) {
  const handleContentChanged = () => void reloadContent();

  switch (modal.type) {
    case 'addAttraction':
      return (
        <AttractionModal
          tripId={trip.id}
          onClose={onClose}
          onSave={(a, staged) => onSaveAttraction(modal.dayIndex, a, staged)}
          onImagesChanged={handleContentChanged}
        />
      );
    case 'editAttraction':
      return (
        <AttractionModal
          tripId={trip.id}
          attraction={modal.attraction}
          onClose={onClose}
          onSave={a => onSaveAttraction(modal.dayIndex, a)}
          onImagesChanged={handleContentChanged}
        />
      );
    case 'editConnection': {
      const day = content.days[modal.dayIndex];
      return (
        <TravelConnectionModal
          tripId={trip.id}
          connection={modal.connection}
          fromName={attractionName(day, modal.connection.fromAttractionId)}
          toName={attractionName(day, modal.connection.toAttractionId)}
          onClose={onClose}
          onSave={(c, staged) => onSaveConnection(modal.dayIndex, c, staged)}
          onImagesChanged={handleContentChanged}
        />
      );
    }
    case 'editDayNote':
      return (
        <EditDayNoteModal
          tripId={trip.id}
          day={content.days[modal.dayIndex]}
          onClose={() => {
            onClose();
            handleContentChanged();
          }}
          onSave={notes => onSaveDayNotes(modal.dayIndex, notes)}
        />
      );
    case 'dayMap':
      return (
        <DayMapModal
          tripId={trip.id}
          days={content.days}
          initialDayIndex={modal.dayIndex}
          onClose={onClose}
        />
      );
    case 'timeline':
      return <TripTimelineModal days={content.days} onClose={onClose} />;
    case 'editTrip':
      return (
        <EditTripModal
          trip={trip}
          initialContent={content}
          onClose={onClose}
          onUpdated={updated => {
            onTripUpdated(updated);
            onClose();
          }}
          onContentChanged={handleContentChanged}
          onImagesChanged={() => void reloadTrip()}
        />
      );
    case 'none':
      return null;
  }
}
