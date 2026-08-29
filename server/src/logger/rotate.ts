export interface RotationStep {
  operation: 'rename' | 'delete';
  /** Filename only (no directory), e.g. "app.2.log". */
  from: string;
  /** Filename only; present only for "rename" steps. */
  to?: string;
}

/**
 * Computes the sequence of rename/delete operations that shifts every
 * rotated file up by one index and frees "<baseName>.1<ext>" for the
 * currently-active file to move into — never overwriting an existing file.
 *
 * `existingIndexes` are the numeric suffixes of rotated files already on
 * disk (e.g. [1, 2, 3] for app.1.log, app.2.log, app.3.log), in any order.
 * Steps are ordered highest-numbered first so a lower-numbered file is
 * always moved out of the way before a higher-numbered one could collide
 * with it (renaming .1 before .2 would otherwise clobber the pre-existing
 * .2).
 *
 * A file whose shifted index would exceed `maxFiles` is deleted instead of
 * renamed (this also self-heals stray files left over from a previously
 * larger `maxFiles`). `maxFiles <= 0` means unlimited retention: nothing is
 * ever deleted.
 */
export function planRotation(
  baseName: string,
  ext: string,
  existingIndexes: number[],
  maxFiles: number,
): RotationStep[] {
  const rotatedName = (n: number): string => `${baseName}.${n}${ext}`;
  const sortedDescending = [...existingIndexes].sort((a, b) => b - a);

  const steps: RotationStep[] = sortedDescending.map(n => {
    const nextIndex = n + 1;
    if (maxFiles > 0 && nextIndex > maxFiles) {
      return { operation: 'delete', from: rotatedName(n) };
    }
    return {
      operation: 'rename',
      from: rotatedName(n),
      to: rotatedName(nextIndex),
    };
  });

  steps.push({
    operation: 'rename',
    from: `${baseName}${ext}`,
    to: rotatedName(1),
  });

  return steps;
}

/**
 * Extracts the numeric suffixes of rotated log files (e.g. "app.2.log" ->
 * 2) matching `<baseName>.<n><ext>` out of a directory listing.
 */
export function findRotatedIndexes(
  filenames: string[],
  baseName: string,
  ext: string,
): number[] {
  const escape = (s: string): string =>
    s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escape(baseName)}\\.(\\d+)${escape(ext)}$`);

  const indexes: number[] = [];
  for (const name of filenames) {
    const match = pattern.exec(name);
    if (match) {
      indexes.push(Number(match[1]));
    }
  }
  return indexes;
}
