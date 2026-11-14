import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSubmitting } from './useSubmitting';

function deferred() {
  let resolve!: () => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useSubmitting', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useSubmitting());

    expect(result.current.submitting).toBe(false);
  });

  it.each([
    { name: 'resolves', settle: 'resolve' as const },
    { name: 'rejects', settle: 'reject' as const },
  ])(
    'ignores concurrent calls and resets after the action $name',
    async ({ settle }) => {
      const { result } = renderHook(() => useSubmitting());
      const pending = deferred();
      const fn = vi.fn(() => pending.promise);

      let first!: Promise<void>;
      let second!: Promise<void>;
      act(() => {
        first = result.current.run(fn);
        second = result.current.run(fn);
      });

      expect(fn).toHaveBeenCalledTimes(1);
      expect(result.current.submitting).toBe(true);
      await act(() => second);

      if (settle === 'resolve') {
        pending.resolve();
        await act(() => first);
      } else {
        pending.reject(new Error('boom'));
        await act(async () => {
          await expect(first).rejects.toThrow('boom');
        });
      }

      expect(result.current.submitting).toBe(false);
      const next = vi.fn().mockResolvedValue(undefined);
      await act(() => result.current.run(next));
      expect(next).toHaveBeenCalledTimes(1);
    },
  );
});
