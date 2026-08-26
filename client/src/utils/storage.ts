// Backward-compatible barrel: all API calls now live under `@/api/*`,
// split by resource. This file re-exports them so existing `@/utils/storage`
// imports keep working without a project-wide import rewrite.
export * from '@/api/attractions';
export * from '@/api/backup';
export * from '@/api/checklistTemplate';
export * from '@/api/connections';
export * from '@/api/dayLocations';
export * from '@/api/dayNotes';
export * from '@/api/images';
export * from '@/api/tripChecklist';
export * from '@/api/trips';

// Re-export types used by consumers so they don't need to import from two places
export type {
  TransportMode,
  Attraction,
  AttractionImage,
  ItemSpec,
  ReferenceWebsite,
  TravelConnection,
} from '@/types';
