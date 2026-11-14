import { showToast } from '@/lib/toast';

export interface MutationOptions<T> {
  /** Refreshes the page data once the mutation has succeeded. */
  reload: () => Promise<void>;
  /** Runs after the reload with the mutation's result (e.g. closing a modal). */
  onSuccess?: (result: T) => void;
  /** Success toast text; omit to show no success toast. */
  success?: string;
  /** Error toast text shown when the mutation, reload or `onSuccess` throws. */
  error: string;
}

/**
 * Runs a board mutation with the page's standard feedback flow: perform the
 * mutation, reload the page data, run `onSuccess`, then show the success
 * toast. Any failure along the way is swallowed and reported through the
 * error toast so callers never need their own try/catch.
 *
 * @param mutate - Performs the server-side change.
 * @param options - Reload callback, success hook and toast messages.
 */
export async function runMutation<T>(
  mutate: () => Promise<T>,
  { reload, onSuccess, success, error }: MutationOptions<T>,
): Promise<void> {
  try {
    const result = await mutate();
    await reload();
    onSuccess?.(result);
    if (success) {
      showToast('success', success);
    }
  } catch {
    showToast('error', error);
  }
}
