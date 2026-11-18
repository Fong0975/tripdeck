/**
 * Single import point for the trip-data API calls used by UI code
 * (components, pages, hooks). The implementations live under `@/api/*`, split
 * by resource; importing them through this barrel lets tests replace every
 * call at once with `vi.mock('@/utils/storage')`, backed by the manual mock in
 * `./__mocks__/storage.ts`.
 *
 * Not routed through here:
 * - `imageUrl` (`@/api/images`): a pure URL builder rather than a request, so
 *   UI code imports it directly and keeps the real implementation even when
 *   this barrel is mocked.
 * - Maps, weather, page-title, and `@/api/client` helpers, which are wrapped by
 *   their own modules under `@/utils` or are not resource API calls.
 */
export * from '@/api/attractions';
export * from '@/api/backup';
export * from '@/api/checklistLocations';
export * from '@/api/checklistTemplate';
export * from '@/api/connections';
export * from '@/api/dayLocations';
export * from '@/api/dayNotes';
export * from '@/api/images';
export * from '@/api/tripChecklist';
export * from '@/api/trips';
