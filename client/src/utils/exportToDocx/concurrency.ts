/**
 * Maps `items` through the async `fn` with at most `limit` calls in flight at
 * once. Calls start in input order and the resolved values are returned in
 * input order regardless of which call settles first, so the output stays
 * deterministic. Rejects with the first error raised by `fn`.
 *
 * @param items - The inputs to process.
 * @param limit - Maximum number of concurrent `fn` calls (values below 1 are
 *   treated as 1).
 * @param fn - Async mapper, called with each item and its index.
 * @returns The mapped values, index-aligned with `items`.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index], index);
    }
  };

  const workerCount = Math.min(Math.max(limit, 1), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
