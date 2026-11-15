import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { showToast } from '@/components/ui/toast';

import { useRetryableSave } from './useRetryableSave';

vi.mock('@/components/ui/toast');

interface Trackers {
  label: string;
}

function setup(sync: (trackers: Trackers) => Promise<void>) {
  const createTrackers = (): Trackers => ({ label: 'trackers' });
  const onSaved = vi.fn();
  const onClose = vi.fn();
  const { result } = renderHook(() =>
    useRetryableSave({
      createTrackers,
      sync,
      onSaved,
      onClose,
      successMessage: 'ok',
      errorMessage: 'fail',
    }),
  );
  return { result, onSaved, onClose };
}

beforeEach(() => {
  vi.mocked(showToast).mockClear();
});

describe('useRetryableSave', () => {
  it.each([
    {
      description: 'a successful sync',
      outcome: () => Promise.resolve(),
      expectedToast: ['success', 'ok'],
      expectedCallbacks: 1,
    },
    {
      description: 'a failed sync',
      outcome: () => Promise.reject(new Error('network')),
      expectedToast: ['error', 'fail'],
      expectedCallbacks: 0,
    },
  ])(
    'reports $description via toast and callbacks',
    async ({ outcome, expectedToast, expectedCallbacks }) => {
      const { result, onSaved, onClose } = setup(outcome);

      await act(() => result.current.handleSave());

      expect(showToast).toHaveBeenCalledWith(...expectedToast);
      expect(onSaved).toHaveBeenCalledTimes(expectedCallbacks);
      expect(onClose).toHaveBeenCalledTimes(expectedCallbacks);
      expect(result.current.saving).toBe(false);
    },
  );

  it('reuses the same trackers after a failure and resets them on success', async () => {
    const seen: Trackers[] = [];
    const sync = vi
      .fn<(trackers: Trackers) => Promise<void>>()
      .mockImplementationOnce(async trackers => {
        seen.push(trackers);
        throw new Error('network');
      })
      .mockImplementation(async trackers => {
        seen.push(trackers);
      });
    const { result } = setup(sync);

    await act(() => result.current.handleSave());
    await act(() => result.current.handleSave());
    await act(() => result.current.handleSave());

    expect(seen[1]).toBe(seen[0]);
    expect(seen[2]).not.toBe(seen[1]);
  });

  it('ignores a second save while one is in flight', async () => {
    let resolve = (): void => undefined;
    const pending = new Promise<void>(r => {
      resolve = () => r();
    });
    const sync = vi.fn(() => pending);
    const { result } = setup(sync);

    await act(async () => {
      const first = result.current.handleSave();
      const second = result.current.handleSave();
      resolve();
      await Promise.all([first, second]);
    });

    expect(sync).toHaveBeenCalledTimes(1);
  });
});
