/**
 * Checks that `orderedIds` is exactly a permutation of `currentIds`: same
 * size, no duplicates, every entry a positive safe integer present in the
 * current set.
 *
 * @param orderedIds - Order requested by the client.
 * @param currentIds - The sibling ids as stored.
 * @returns True when the requested order covers every sibling exactly once.
 */
export function isPermutationOf(
  orderedIds: readonly unknown[],
  currentIds: readonly number[],
): orderedIds is readonly number[] {
  if (orderedIds.length !== currentIds.length) {
    return false;
  }
  const current = new Set(currentIds);
  const seen = new Set<number>();
  for (const id of orderedIds) {
    if (
      typeof id !== 'number' ||
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      !current.has(id) ||
      seen.has(id)
    ) {
      return false;
    }
    seen.add(id);
  }
  return true;
}
