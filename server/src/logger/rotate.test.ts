import { describe, expect, it } from 'vitest';

import { findRotatedIndexes, planRotation } from './rotate';

describe('findRotatedIndexes', () => {
  it('extracts numeric suffixes matching <baseName>.<n><ext>', () => {
    expect(
      findRotatedIndexes(
        ['app.log', 'app.1.log', 'app.2.log', 'other.log', 'app.log.bak'],
        'app',
        '.log',
      ),
    ).toEqual([1, 2]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(findRotatedIndexes(['app.log'], 'app', '.log')).toEqual([]);
  });

  it('escapes regex-special characters in baseName/ext', () => {
    expect(findRotatedIndexes(['a.b.1.c.d', 'a.b.log'], 'a.b', '.c.d')).toEqual(
      [1],
    );
  });
});

describe('planRotation', () => {
  it('renames the active file to .1 when there are no existing rotated files', () => {
    expect(planRotation('app', '.log', [], 5)).toEqual([
      { operation: 'rename', from: 'app.log', to: 'app.1.log' },
    ]);
  });

  it('shifts existing rotated files up, highest-numbered first', () => {
    const steps = planRotation('app', '.log', [1, 2, 3], 5);

    expect(steps).toEqual([
      { operation: 'rename', from: 'app.3.log', to: 'app.4.log' },
      { operation: 'rename', from: 'app.2.log', to: 'app.3.log' },
      { operation: 'rename', from: 'app.1.log', to: 'app.2.log' },
      { operation: 'rename', from: 'app.log', to: 'app.1.log' },
    ]);
  });

  it('deletes files that would shift past maxFiles instead of renaming them', () => {
    const steps = planRotation('app', '.log', [1, 2, 3], 3);

    expect(steps).toEqual([
      { operation: 'delete', from: 'app.3.log' },
      { operation: 'rename', from: 'app.2.log', to: 'app.3.log' },
      { operation: 'rename', from: 'app.1.log', to: 'app.2.log' },
      { operation: 'rename', from: 'app.log', to: 'app.1.log' },
    ]);
  });

  it('self-heals stray files already beyond a reduced maxFiles', () => {
    // e.g. maxFiles was lowered from 5 to 1 after app.1..5.log existed.
    // Retaining only 1 historical file means every existing rotated file
    // (including app.1.log, whose shifted index of 2 would also exceed the
    // new limit) is deleted, leaving only the just-rotated app.log behind
    // as the sole app.1.log.
    const steps = planRotation('app', '.log', [1, 2, 3, 4, 5], 1);

    expect(steps).toEqual([
      { operation: 'delete', from: 'app.5.log' },
      { operation: 'delete', from: 'app.4.log' },
      { operation: 'delete', from: 'app.3.log' },
      { operation: 'delete', from: 'app.2.log' },
      { operation: 'delete', from: 'app.1.log' },
      { operation: 'rename', from: 'app.log', to: 'app.1.log' },
    ]);
  });

  it('never deletes when maxFiles is 0 (unlimited retention)', () => {
    const steps = planRotation('app', '.log', [1, 2, 3], 0);

    expect(steps.every(step => step.operation === 'rename')).toBe(true);
    expect(steps).toHaveLength(4);
  });

  it('does not mutate the input array', () => {
    const indexes = [3, 1, 2];
    planRotation('app', '.log', indexes, 5);

    expect(indexes).toEqual([3, 1, 2]);
  });
});
