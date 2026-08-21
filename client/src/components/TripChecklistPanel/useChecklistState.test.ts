import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TripChecklist } from '@/types';
import { getTripChecklist, setCheck } from '@/utils/storage';

import { useChecklistState } from './useChecklistState';

vi.mock('@/utils/storage', () => ({
  getTripChecklist: vi.fn(),
  setCheck: vi.fn(),
}));

function makeChecklist(): TripChecklist {
  return {
    tripId: 1,
    occasions: [{ id: 1, name: 'Occ A', checks: { 10: true } }],
    categories: [
      {
        id: 1,
        name: 'Cat A',
        items: [
          { id: 10, name: 'Item A' },
          { id: 20, name: 'Item B' },
        ],
      },
    ],
  };
}

async function renderLoaded(onDirtyChange = vi.fn()) {
  const view = renderHook(() => useChecklistState(1, onDirtyChange));
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

beforeEach(() => {
  vi.clearAllMocks();
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

  it('handleToggleCheck flips the local value seen by getCheck', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.handleToggleCheck(1, 10));

    expect(result.current.getCheck(1, 10)).toBe(false);
  });

  it('isDirty is false with no local edits', async () => {
    const { result } = await renderLoaded();

    expect(result.current.isDirty).toBe(false);
  });

  it('isDirty is true once a local edit differs from the saved value', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.handleToggleCheck(1, 10));

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

  it('prevents unload only while dirty', async () => {
    const { result } = await renderLoaded();

    const cleanEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);

    act(() => result.current.handleToggleCheck(1, 10));

    const dirtyEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);
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
  });

  it('handleSaveChecks skips entries whose local value matches the saved value', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.handleToggleCheck(1, 10));
    act(() => result.current.handleToggleCheck(1, 10));
    act(() => result.current.handleToggleCheck(1, 20));

    await act(() => result.current.handleSaveChecks());

    expect(setCheck).toHaveBeenCalledTimes(1);
    expect(setCheck).toHaveBeenCalledWith(1, 1, 20, true);
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
  });

  it('handleDiscardChecks clears local edits without calling setCheck', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.handleToggleCheck(1, 10));

    act(() => result.current.handleDiscardChecks());

    expect(result.current.isDirty).toBe(false);
    expect(setCheck).not.toHaveBeenCalled();
  });

  it('handleEditSaved clears local edits and reloads', async () => {
    const { result } = await renderLoaded();
    act(() => result.current.handleToggleCheck(1, 10));
    vi.mocked(getTripChecklist).mockClear();

    await act(() => result.current.handleEditSaved());

    expect(result.current.isDirty).toBe(false);
    expect(getTripChecklist).toHaveBeenCalledTimes(1);
  });
});
