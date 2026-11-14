import { useRef } from 'react';

import { useSubmitting } from '@/hooks/useSubmitting';
import { showToast } from '@/lib/toast';

/** Options for {@link useRetryableSave}. */
export interface RetryableSaveOptions<TTrackers> {
  /** Creates a fresh set of sync trackers for a new edit session. */
  createTrackers: () => TTrackers;
  /** Runs the full diff sync using the (possibly partially-filled) trackers. */
  sync: (trackers: TTrackers) => Promise<void>;
  /** Called after a fully successful save. */
  onSaved: () => void;
  /** Closes the edit modal after a successful save. */
  onClose: () => void;
  /** Toast text shown after a successful save. */
  successMessage: string;
  /** Toast text shown when the save fails. */
  errorMessage: string;
}

/**
 * Shared save flow of the checklist edit modals.
 *
 * Saving is many sequential API calls, so a failure can leave some of them
 * applied. Rather than reloading (which would discard the user's unsaved
 * edits), the sync trackers persist across save attempts for this modal
 * session, making a retry skip the creates/deletes that already succeeded
 * instead of duplicating them or hitting 404s. The trackers are reset only
 * after a fully successful save. Concurrent saves are ignored while one is
 * in flight.
 *
 * @returns `saving` while a save is in flight, and the `handleSave` action.
 */
export function useRetryableSave<TTrackers>({
  createTrackers,
  sync,
  onSaved,
  onClose,
  successMessage,
  errorMessage,
}: RetryableSaveOptions<TTrackers>) {
  const { submitting: saving, run } = useSubmitting();
  const trackers = useRef(createTrackers());

  const save = async () => {
    try {
      await sync(trackers.current);
      trackers.current = createTrackers();
      onSaved();
      onClose();
      showToast('success', successMessage);
    } catch {
      showToast('error', errorMessage);
    }
  };

  const handleSave = () => run(save);

  return { saving, handleSave };
}
