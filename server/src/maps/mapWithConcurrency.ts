/**
 * Runs `worker` over `items` with at most `limit` calls in flight at once.
 *
 * @param items - Work items.
 * @param limit - Maximum concurrent workers (at least 1).
 * @param worker - Async function applied to each item; must not throw.
 */
export async function mapWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const lanes = Array.from(
    { length: Math.min(Math.max(limit, 1), items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next++];
        await worker(item);
      }
    },
  );
  await Promise.all(lanes);
}
