import type { Attraction } from '@tripdeck/shared';

export type {
  Attraction,
  AutoBackupFileInfo,
  ChecklistCategory,
  ChecklistItem,
  ChecklistOccasion,
  ChecklistTemplate,
  DayLocation,
  DayPlan,
  FailedTripResult,
  GeoSource,
  ImportBackupErrorDetails,
  ImportBackupResult,
  ImportedTripResult,
  ItemSpec,
  MissingBackupImages,
  ReferenceWebsite,
  TransportMode,
  TravelConnection,
  Trip,
  TripChecklist,
  TripContent,
  UploadedImage,
} from '@tripdeck/shared';

/**
 * An attraction as edited in the attraction modal: a new one has id 0 and no
 * server-assigned fields yet, so everything but the id and name is optional.
 */
export type AttractionDraft = Pick<Attraction, 'id' | 'name'> &
  Partial<Attraction>;
