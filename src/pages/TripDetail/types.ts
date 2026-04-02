import type { Attraction, TravelConnection } from '@/types';

export type ModalState =
  | { type: 'none' }
  | { type: 'addAttraction'; dayIndex: number }
  | { type: 'editAttraction'; dayIndex: number; attraction: Attraction }
  | { type: 'editConnection'; dayIndex: number; connection: TravelConnection };
