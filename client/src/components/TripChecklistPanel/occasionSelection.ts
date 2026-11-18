import type { ChecklistOccasion } from '@/types';

/**
 * Ids of the occasions whose columns are hidden. Everything not listed is
 * shown, so occasions added later are shown too.
 */
export type HiddenOccasionIds = ReadonlySet<number>;

/** Selection that hides no occasion. */
export const NO_HIDDEN_OCCASIONS: HiddenOccasionIds = new Set<number>();

/**
 * Lists the occasions whose columns are shown. At least one occasion always
 * stays: when the selection would hide them all (e.g. after the shown
 * occasions were deleted), every occasion is shown.
 *
 * @param occasions - All occasions of the checklist.
 * @param hidden - Ids of the hidden occasions.
 */
export function getVisibleOccasions(
  occasions: ChecklistOccasion[],
  hidden: HiddenOccasionIds,
): ChecklistOccasion[] {
  const shown = occasions.filter(occasion => !hidden.has(occasion.id));
  return shown.length > 0 ? shown : occasions;
}

/**
 * Flips the visibility of one occasion. The last shown occasion cannot be
 * hidden.
 *
 * @param occasions - All occasions of the checklist.
 * @param hidden - Ids of the hidden occasions.
 * @param id - Occasion to flip.
 * @returns The new set, or `hidden` itself when the change is refused.
 */
export function toggleOccasion(
  occasions: ChecklistOccasion[],
  hidden: HiddenOccasionIds,
  id: number,
): HiddenOccasionIds {
  const next = new Set(hidden);
  if (next.delete(id)) {
    return next;
  }
  next.add(id);
  return occasions.every(occasion => next.has(occasion.id)) ? hidden : next;
}
