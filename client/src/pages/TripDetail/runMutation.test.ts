import { describe, expect, it, vi } from 'vitest';

import { showToast } from '@/lib/toast';

import { runMutation } from './runMutation';

vi.mock('@/lib/toast');

describe('runMutation', () => {
  it.each([
    {
      description: 'reloads, runs onSuccess and shows the success toast',
      fails: null,
      success: 'Saved.',
      expectReload: true,
      expectOnSuccess: true,
      expectToast: ['success', 'Saved.'],
    },
    {
      description: 'shows no toast on success when no success message is set',
      fails: null,
      success: undefined,
      expectReload: true,
      expectOnSuccess: true,
      expectToast: null,
    },
    {
      description: 'skips reload and onSuccess when the mutation fails',
      fails: 'mutate',
      success: 'Saved.',
      expectReload: false,
      expectOnSuccess: false,
      expectToast: ['error', 'Failed.'],
    },
    {
      description: 'skips onSuccess and reports an error when the reload fails',
      fails: 'reload',
      success: 'Saved.',
      expectReload: true,
      expectOnSuccess: false,
      expectToast: ['error', 'Failed.'],
    },
    {
      description: 'reports an error when onSuccess throws',
      fails: 'onSuccess',
      success: 'Saved.',
      expectReload: true,
      expectOnSuccess: true,
      expectToast: ['error', 'Failed.'],
    },
  ])(
    '$description',
    async ({ fails, success, expectReload, expectOnSuccess, expectToast }) => {
      const mutate = vi.fn(() =>
        fails === 'mutate'
          ? Promise.reject(new Error('mutate failed'))
          : Promise.resolve(42),
      );
      const reload = vi.fn(() =>
        fails === 'reload'
          ? Promise.reject(new Error('reload failed'))
          : Promise.resolve(),
      );
      const onSuccess = vi.fn(() => {
        if (fails === 'onSuccess') {
          throw new Error('onSuccess failed');
        }
      });

      await expect(
        runMutation(mutate, { reload, onSuccess, success, error: 'Failed.' }),
      ).resolves.toBeUndefined();

      expect(mutate).toHaveBeenCalledTimes(1);
      expect(reload).toHaveBeenCalledTimes(expectReload ? 1 : 0);
      if (expectOnSuccess) {
        expect(onSuccess).toHaveBeenCalledWith(42);
      } else {
        expect(onSuccess).not.toHaveBeenCalled();
      }
      if (expectToast) {
        expect(showToast).toHaveBeenCalledTimes(1);
        expect(showToast).toHaveBeenCalledWith(...expectToast);
      } else {
        expect(showToast).not.toHaveBeenCalled();
      }
    },
  );

  it('runs onSuccess before showing the success toast', async () => {
    const order: string[] = [];
    vi.mocked(showToast).mockImplementationOnce(() => {
      order.push('toast');
    });

    await runMutation(() => Promise.resolve(), {
      reload: () => {
        order.push('reload');
        return Promise.resolve();
      },
      onSuccess: () => order.push('onSuccess'),
      success: 'Saved.',
      error: 'Failed.',
    });

    expect(order).toEqual(['reload', 'onSuccess', 'toast']);
  });
});
