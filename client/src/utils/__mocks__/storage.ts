import { vi } from 'vitest';

/**
 * Manual mock for `@/utils/storage`, used via `vi.mock('@/utils/storage')`.
 * Every API function is a bare `vi.fn()`; tests set return values themselves.
 */

export const addAttraction = vi.fn();
export const updateAttraction = vi.fn();
export const deleteAttraction = vi.fn();
export const duplicateAttraction = vi.fn();
export const reorderAttractions = vi.fn();

export const exportTripsBackup = vi.fn();
export const importTripsBackup = vi.fn();
export const listAutoBackups = vi.fn();
export const getAutoBackupDownloadUrl = vi.fn();

export const getChecklistTemplate = vi.fn();
export const addTemplateCategory = vi.fn();
export const updateTemplateCategory = vi.fn();
export const deleteTemplateCategory = vi.fn();
export const addTemplateItem = vi.fn();
export const updateTemplateItem = vi.fn();
export const deleteTemplateItem = vi.fn();
export const addTemplateItemSpec = vi.fn();
export const updateTemplateItemSpec = vi.fn();
export const deleteTemplateItemSpec = vi.fn();

export const addConnection = vi.fn();
export const updateConnection = vi.fn();
export const deleteConnection = vi.fn();

export const addDayLocation = vi.fn();
export const updateDayLocation = vi.fn();
export const deleteDayLocation = vi.fn();

export const updateDayNotes = vi.fn();

export const uploadAttractionImage = vi.fn();
export const deleteAttractionImage = vi.fn();
export const uploadConnectionImage = vi.fn();
export const deleteConnectionImage = vi.fn();
export const uploadTripImage = vi.fn();
export const deleteTripImage = vi.fn();
export const uploadDayImage = vi.fn();
export const deleteDayImage = vi.fn();

export const addTripCategory = vi.fn();
export const updateTripCategory = vi.fn();
export const deleteTripCategory = vi.fn();
export const addTripItem = vi.fn();
export const updateTripItem = vi.fn();
export const deleteTripItem = vi.fn();
export const addTripItemSpec = vi.fn();
export const updateTripItemSpec = vi.fn();
export const deleteTripItemSpec = vi.fn();
export const getTripChecklist = vi.fn();
export const addOccasion = vi.fn();
export const updateOccasion = vi.fn();
export const deleteOccasion = vi.fn();
export const setCheck = vi.fn();

export const getTrips = vi.fn();
export const getTrip = vi.fn();
export const createTrip = vi.fn();
export const updateTrip = vi.fn();
export const deleteTrip = vi.fn();
export const getTripContent = vi.fn();
