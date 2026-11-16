import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { showToast } from '@/components/ui/toast';
import {
  makeChecklistCategory,
  makeChecklistItem,
  makeTripChecklist,
} from '@/test-utils/fixtures';
import type { TripChecklist } from '@/types';
import { getTripChecklist, setCheck } from '@/utils/storage';

import { useChecklistState } from './useChecklistState';

vi.mock('@/utils/storage');

vi.mock('@/components/ui/toast');

function makeChecklist(): TripChecklist {
  return makeTripChecklist({
    occasions: [{ id: 1, name: 'Occ A', checks: { 10: true }, specChecks: {} }],
    categories: [
      makeChecklistCategory({
        name: 'Cat A',
        items: [
          makeChecklistItem({ id: 10, name: 'Item A' }),
          makeChecklistItem({ id: 20, name: 'Item B' }),
        ],
      }),
    ],
  });
}

async function renderLoaded(onDirtyChange = vi.fn()) {
  const view = renderHook(() => useChecklistState(1, onDirtyChange));
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

beforeEach(() => {
  vi.mocked(getTripChecklist).mockResolvedValue(makeChecklist());
  vi.mocked(setCheck).mockResolvedValue(undefined);
});

describe('useChecklistState', () => {
  it('starts in a loading state and loads the checklist', async () => {
    const { result } = renderHook(() => useChecklistState(1));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.checklist).toEqual(makeChecklist());
  });

  it('getCheck falls back to the saved value when there is no local edit', async () => {
    const { result } = await renderLoaded();

    expect(result.current.getCheck(1, 10)).toBe(true);
    expect(result.current.getCheck(1, 20)).toBe(false);
  });

  it('handleToggleCheck flips the local value seen by getCheck and marks the state dirty', async () => {
    const { result } = await renderLoaded();
    expect(result.current.isDirty).toBe(false);

    act(() => result.current.handleToggleCheck(1, 10));

    expect(result.current.getCheck(1, 10)).toBe(false);
    expect(result.current.isDirty).toBe(true);
  });

  it('isDirty returns to false after toggling back to the saved value', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.handleToggleCheck(1, 10));
    act(() => result.current.handleToggleCheck(1, 10));

    expect(result.current.isDirty).toBe(false);
  });

  it('calls onDirtyChange whenever isDirty changes', async () => {
    const onDirtyChange = vi.fn();
    const { result } = await renderLoaded(onDirtyChange);
    onDirtyChange.mockClear();

    act(() => result.current.handleToggleCheck(1, 10));

    await waitFor(() => expect(onDirtyChange).toHaveBeenCalledWith(true));
  });

  it('handleSaveChecks only sends entries whose local value differs from saved, then reloads', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.handleToggleCheck(1, 10));
    act(() => result.current.handleToggleCheck(1, 20));
    vi.mocked(getTripChecklist).mockClear();

    await act(() => result.current.handleSaveChecks());

    expect(setCheck).toHaveBeenCalledTimes(2);
    expect(setCheck).toHaveBeenCalledWith(1, 1, 10, false);
    expect(setCheck).toHaveBeenCalledWith(1, 1, 20, true);
    expect(result.current.isDirty).toBe(false);
    expect(getTripChecklist).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith('success', '已儲存打包清單勾選。');
  });

  it('handleSaveChecks skips entries whose local value matches the saved value', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.handleToggleCheck(1, 10));
    act(() => result.current.handleToggleCheck(1, 10));
    act(() => result.current.handleToggleCheck(1, 20));

    await act(() => result.current.handleSaveChecks());

    expect(setCheck).toHaveBeenCalledTimes(1);
    expect(setCheck).toHaveBeenCalledWith(1, 1, 20, true);
    expect(showToast).toHaveBeenCalledWith('success', '已儲存打包清單勾選。');
  });

  it('shows an error toast and preserves local edits when handleSaveChecks fails', async () => {
    vi.mocked(setCheck).mockRejectedValue(new Error('network'));
    const { result } = await renderLoaded();
    act(() => result.current.handleToggleCheck(1, 10));
    vi.mocked(getTripChecklist).mockClear();

    await act(() => result.current.handleSaveChecks());

    expect(showToast).toHaveBeenCalledWith(
      'error',
      '儲存打包清單勾選失敗，請稍後再試',
    );
    expect(getTripChecklist).not.toHaveBeenCalled();
    expect(result.current.isDirty).toBe(true);
    expect(result.current.getCheck(1, 10)).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  it('tracks saving as true while the save is in flight, then false', async () => {
    let resolveSetCheck!: () => void;
    vi.mocked(setCheck).mockReturnValue(
      new Promise(resolve => {
        resolveSetCheck = () => resolve(undefined);
      }),
    );
    const { result } = await renderLoaded();
    act(() => result.current.handleToggleCheck(1, 10));

    let savePromise!: Promise<void>;
    act(() => {
      savePromise = result.current.handleSaveChecks();
    });
    expect(result.current.saving).toBe(true);

    await act(async () => {
      resolveSetCheck();
      await savePromise;
    });
    expect(result.current.saving).toBe(false);
    expect(showToast).toHaveBeenCalledWith('success', '已儲存打包清單勾選。');
  });

  it('handleDiscardChecks clears local edits without calling setCheck', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.handleToggleCheck(1, 10));

    act(() => result.current.handleDiscardChecks());

    expect(result.current.isDirty).toBe(false);
    expect(setCheck).not.toHaveBeenCalled();
  });

  it.each([
    {
      description: 'keeps unsaved checks for items that still exist',
      reloaded: makeChecklist(),
      expectedDirty: true,
      expectedCheck: false,
    },
    {
      description: 'drops unsaved checks for items that were removed',
      reloaded: makeTripChecklist({
        occasions: [{ id: 1, name: 'Occ A', checks: {}, specChecks: {} }],
        categories: [
          makeChecklistCategory({
            name: 'Cat A',
            items: [makeChecklistItem({ id: 20, name: 'Item B' })],
          }),
        ],
      }),
      expectedDirty: false,
      expectedCheck: false,
    },
    {
      description: 'drops unsaved checks for occasions that were removed',
      reloaded: makeTripChecklist({
        occasions: [{ id: 2, name: 'Occ B', checks: {}, specChecks: {} }],
        categories: makeChecklist().categories,
      }),
      expectedDirty: false,
      expectedCheck: false,
    },
  ])(
    'handleEditSaved reloads and $description',
    async ({ reloaded, expectedDirty, expectedCheck }) => {
      const { result } = await renderLoaded();
      act(() => result.current.handleToggleCheck(1, 10));
      vi.mocked(getTripChecklist).mockClear();
      vi.mocked(getTripChecklist).mockResolvedValueOnce(reloaded);

      await act(() => result.current.handleEditSaved());

      expect(getTripChecklist).toHaveBeenCalledTimes(1);
      expect(result.current.checklist).toEqual(reloaded);
      expect(result.current.isDirty).toBe(expectedDirty);
      expect(result.current.getCheck(1, 10)).toBe(expectedCheck);
    },
  );

  it('handleEditSaved keeps local edits and shows a toast when the reload fails', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.handleToggleCheck(1, 10));
    vi.mocked(getTripChecklist).mockRejectedValueOnce(new Error('API error'));

    await act(() => result.current.handleEditSaved());

    expect(result.current.isDirty).toBe(true);
    expect(result.current.checklist).toEqual(makeChecklist());
    expect(showToast).toHaveBeenCalledWith(
      'error',
      '重新載入打包清單失敗，請稍後再試',
    );
  });

  it('sets loadError when the initial load fails and recovers via retryLoad', async () => {
    vi.mocked(getTripChecklist).mockRejectedValueOnce(new Error('API error'));

    const { result } = await renderLoaded();

    expect(result.current.loadError).toBe(true);
    expect(result.current.checklist).toBeNull();

    await act(() => result.current.retryLoad());

    expect(result.current.loadError).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.checklist).toEqual(makeChecklist());
  });

  it.each([
    { description: 'clean', dirty: false },
    { description: 'dirty', dirty: true },
  ])(
    'reports not-dirty to onDirtyChange on unmount when $description',
    async ({ dirty }) => {
      const onDirtyChange = vi.fn();
      const { result, unmount } = await renderLoaded(onDirtyChange);
      if (dirty) {
        act(() => result.current.handleToggleCheck(1, 10));
        await waitFor(() =>
          expect(onDirtyChange).toHaveBeenLastCalledWith(true),
        );
      }
      onDirtyChange.mockClear();

      unmount();

      expect(onDirtyChange).toHaveBeenCalledWith(false);
    },
  );
});
