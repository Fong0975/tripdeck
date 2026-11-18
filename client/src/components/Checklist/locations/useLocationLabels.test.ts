import { act, renderHook, waitFor } from '@testing-library/react';
import type { LocationLabelsResponse } from '@tripdeck/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/client';
import { showToast } from '@/components/ui/toast';
import {
  addLocationLabel,
  deleteLocationLabel,
  getLocationLabels,
  reorderLocationLabels,
  updateLocationLabel,
} from '@/utils/storage';

import { useLocationLabels } from './useLocationLabels';

vi.mock('@/utils/storage');
vi.mock('@/components/ui/toast');

const stored: LocationLabelsResponse = {
  labels: [
    { id: 1, name: '託運', show_as_group: true, sort_order: 0 },
    { id: 2, name: '隨身', show_as_group: true, sort_order: 1 },
    { id: 3, name: '手提', show_as_group: false, sort_order: 2 },
  ],
  orphans: [{ name: '背包', trip_count: 2 }],
};

async function renderLoaded() {
  const view = renderHook(() => useLocationLabels());
  await waitFor(() => expect(view.result.current.data).toEqual(stored));
  return view;
}

beforeEach(() => {
  vi.mocked(getLocationLabels).mockResolvedValue(stored);
});

describe('useLocationLabels', () => {
  it('loads the labels and orphans on mount', async () => {
    const { result } = renderHook(() => useLocationLabels());

    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.data).toEqual(stored));
    expect(result.current.loadError).toBe(false);
  });

  it('flags loadError when loading fails and clears it on a successful retry', async () => {
    vi.mocked(getLocationLabels).mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useLocationLabels());
    await waitFor(() => expect(result.current.loadError).toBe(true));
    expect(result.current.data).toBeNull();

    await act(() => result.current.reload());

    expect(result.current.loadError).toBe(false);
    expect(result.current.data).toEqual(stored);
  });

  describe('addLabel and removeLabel', () => {
    it.each([
      {
        name: 'addLabel succeeds',
        setup: () =>
          vi.mocked(addLocationLabel).mockResolvedValue(stored.labels[0]),
        run: (r: ReturnType<typeof useLocationLabels>) =>
          r.addLabel('手提', false),
        success: true,
        toast: ['success', '已新增存放位置。'],
        reloads: true,
      },
      {
        name: 'addLabel hits a duplicate name',
        setup: () =>
          vi
            .mocked(addLocationLabel)
            .mockRejectedValue(new ApiError('dup', undefined, 409)),
        run: (r: ReturnType<typeof useLocationLabels>) =>
          r.addLabel('託運', true),
        success: false,
        toast: ['error', '已有同名的存放位置'],
        reloads: false,
      },
      {
        name: 'addLabel fails otherwise',
        setup: () =>
          vi.mocked(addLocationLabel).mockRejectedValue(new Error('x')),
        run: (r: ReturnType<typeof useLocationLabels>) =>
          r.addLabel('手提', true),
        success: false,
        toast: ['error', '新增存放位置失敗，請稍後再試'],
        reloads: false,
      },
      {
        name: 'removeLabel succeeds',
        setup: () => vi.mocked(deleteLocationLabel).mockResolvedValue(),
        run: (r: ReturnType<typeof useLocationLabels>) => r.removeLabel(1),
        success: true,
        toast: ['success', '已刪除存放位置。'],
        reloads: true,
      },
      {
        name: 'removeLabel fails',
        setup: () =>
          vi.mocked(deleteLocationLabel).mockRejectedValue(new Error('x')),
        run: (r: ReturnType<typeof useLocationLabels>) => r.removeLabel(1),
        success: false,
        toast: ['error', '刪除存放位置失敗，請稍後再試'],
        reloads: false,
      },
    ])('$name', async ({ setup, run, success, toast, reloads }) => {
      setup();
      const { result } = await renderLoaded();
      vi.mocked(getLocationLabels).mockClear();

      let outcome: boolean | undefined;
      await act(async () => {
        outcome = await run(result.current);
      });

      expect(outcome).toBe(success);
      expect(showToast).toHaveBeenCalledWith(...toast);
      expect(vi.mocked(getLocationLabels).mock.calls.length > 0).toBe(reloads);
    });
  });

  describe('setShowAsGroup', () => {
    it('saves the flag and reloads', async () => {
      vi.mocked(updateLocationLabel).mockResolvedValue(stored.labels[2]);
      const { result } = await renderLoaded();
      vi.mocked(getLocationLabels).mockClear();

      await act(() => result.current.setShowAsGroup(3, true));

      expect(updateLocationLabel).toHaveBeenCalledWith(3, {
        show_as_group: true,
      });
      expect(getLocationLabels).toHaveBeenCalled();
    });

    it('reports a failure with a toast', async () => {
      vi.mocked(updateLocationLabel).mockRejectedValue(new Error('x'));
      const { result } = await renderLoaded();

      await act(() => result.current.setShowAsGroup(3, true));

      expect(showToast).toHaveBeenCalledWith(
        'error',
        '更新存放位置失敗，請稍後再試',
      );
    });
  });

  describe('moveLabel', () => {
    it.each([
      {
        name: 'moves a label down',
        id: 1,
        direction: 1 as const,
        ordered: [2, 1, 3],
      },
      {
        name: 'moves a label up',
        id: 3,
        direction: -1 as const,
        ordered: [1, 3, 2],
      },
    ])(
      '$name, showing the order at once and saving it',
      async ({ id, direction, ordered }) => {
        vi.mocked(reorderLocationLabels).mockResolvedValue();
        const { result } = await renderLoaded();

        await act(() => result.current.moveLabel(id, direction));

        expect(result.current.data?.labels.map(label => label.id)).toEqual(
          ordered,
        );
        expect(reorderLocationLabels).toHaveBeenCalledWith(ordered);
      },
    );

    it.each([
      { name: 'the first label up', id: 1, direction: -1 as const },
      { name: 'the last label down', id: 3, direction: 1 as const },
      { name: 'an unknown label', id: 99, direction: 1 as const },
    ])('ignores moving $name', async ({ id, direction }) => {
      const { result } = await renderLoaded();

      await act(() => result.current.moveLabel(id, direction));

      expect(reorderLocationLabels).not.toHaveBeenCalled();
    });

    it('reloads the stored order and toasts when saving fails', async () => {
      vi.mocked(reorderLocationLabels).mockRejectedValue(new Error('x'));
      const { result } = await renderLoaded();

      await act(() => result.current.moveLabel(1, 1));

      expect(showToast).toHaveBeenCalledWith(
        'error',
        '調整存放位置順序失敗，請稍後再試',
      );
      expect(result.current.data).toEqual(stored);
    });
  });
});
