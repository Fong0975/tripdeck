import { createSerialQueue } from '../../utils/serialQueue';

/**
 * Process-wide queue shared by every backup operation (scheduled automatic
 * backups, manual export, manual import), so they never interleave their
 * database reads/writes and disk I/O. A zero interval means tasks only wait
 * for the previous one to finish, never for extra spacing.
 */
const backupQueue = createSerialQueue({ minIntervalMs: 0 });

/** Monotonic counter giving every task a distinct queue key (no de-duplication). */
let taskCounter = 0;

/**
 * Runs `task` once every backup operation queued before it has settled,
 * then resolves or rejects with the task's own outcome. Callers wait their
 * turn rather than fail; a rejected task does not block later ones.
 *
 * This lock is in-process only: it does not coordinate several server
 * processes sharing one database.
 *
 * @param task - The backup operation to run exclusively.
 * @returns Whatever `task` resolves to.
 */
export function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  taskCounter += 1;
  return backupQueue.enqueue(`backup-task-${taskCounter}`, task);
}
