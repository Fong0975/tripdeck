import type { Attraction, TravelConnection } from '@/types';

/** Which modal (if any) the trip detail page currently shows. */
export type ModalState =
  | { type: 'none' }
  | { type: 'editTrip' }
  | { type: 'addAttraction'; dayIndex: number }
  | { type: 'editAttraction'; dayIndex: number; attraction: Attraction }
  | { type: 'editConnection'; dayIndex: number; connection: TravelConnection }
  | { type: 'editDayNote'; dayIndex: number }
  | { type: 'dayMap'; dayIndex: number };
