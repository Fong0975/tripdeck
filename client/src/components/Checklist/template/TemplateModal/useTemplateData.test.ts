import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { showToast } from '@/components/ui/toast';
import { makeChecklistCategory } from '@/test-utils/fixtures';
import {
  addTemplateCategory,
  deleteTemplateCategory,
  getChecklistTemplate,
  reorderTemplateCategories,
} from '@/utils/storage';

import { useTemplateData } from './useTemplateData';

vi.mock('@/utils/storage');
vi.mock('@/components/ui/toast');

const template = { categories: [makeChecklistCategory({ name: 'A' })] };

beforeEach(() => {
  vi.mocked(getChecklistTemplate).mockResolvedValue(template);
});

describe('useTemplateData', () => {
  it('loads the template on mount', async () => {
    const { result } = renderHook(() => useTemplateData());

    expect(result.current.template).toBeNull();
    await waitFor(() => expect(result.current.template).toEqual(template));
    expect(result.current.loadError).toBe(false);
  });

  it('flags loadError when the initial load fails and clears it on a successful retry', async () => {
    vi.mocked(getChecklistTemplate).mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useTemplateData());
    await waitFor(() => expect(result.current.loadError).toBe(true));
    expect(result.current.template).toBeNull();

    await act(() => result.current.reload());

    expect(result.current.loadError).toBe(false);
    expect(result.current.template).toEqual(template);
  });

  it.each([
    {
      name: 'addCategory',
      setup: () =>
        vi
          .mocked(addTemplateCategory)
          .mockResolvedValue(makeChecklistCategory({ id: 2, name: '新分類' })),
      run: (r: ReturnType<typeof useTemplateData>) => r.addCategory(),
      success: makeChecklistCategory({ id: 2, name: '新分類' }),
      successToast: '已新增分類。',
    },
    {
      name: 'deleteCategory',
      setup: () => vi.mocked(deleteTemplateCategory).mockResolvedValue(),
      run: (r: ReturnType<typeof useTemplateData>) => r.deleteCategory(1),
      success: true,
      successToast: '已刪除分類。',
    },
  ])(
    '$name reloads and toasts on success',
    async ({ setup, run, success, successToast }) => {
      setup();
      const { result } = renderHook(() => useTemplateData());
      await waitFor(() => expect(result.current.template).not.toBeNull());
      vi.mocked(getChecklistTemplate).mockClear();

      let outcome: unknown;
      await act(async () => {
        outcome = await run(result.current);
      });

      expect(outcome).toEqual(success);
      expect(getChecklistTemplate).toHaveBeenCalledTimes(1);
      expect(showToast).toHaveBeenCalledWith('success', successToast);
    },
  );

  it.each([
    {
      name: 'addCategory',
      failSetup: () =>
        vi.mocked(addTemplateCategory).mockRejectedValue(new Error('x')),
      run: (r: ReturnType<typeof useTemplateData>) => r.addCategory(),
      failure: null,
      errorToast: '新增分類失敗，請稍後再試',
    },
    {
      name: 'deleteCategory',
      failSetup: () =>
        vi.mocked(deleteTemplateCategory).mockRejectedValue(new Error('x')),
      run: (r: ReturnType<typeof useTemplateData>) => r.deleteCategory(1),
      failure: false,
      errorToast: '刪除分類失敗，請稍後再試',
    },
  ])(
    '$name toasts an error and skips the reload on failure',
    async ({ failSetup, run, failure, errorToast }) => {
      failSetup();
      const { result } = renderHook(() => useTemplateData());
      await waitFor(() => expect(result.current.template).not.toBeNull());
      vi.mocked(getChecklistTemplate).mockClear();

      let outcome: unknown;
      await act(async () => {
        outcome = await run(result.current);
      });

      expect(outcome).toBe(failure);
      expect(getChecklistTemplate).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('error', errorToast);
    },
  );
});

describe('useTemplateData reorderCategories', () => {
  const twoCategories = {
    categories: [
      makeChecklistCategory({ id: 1, name: 'A' }),
      makeChecklistCategory({ id: 2, name: 'B' }),
      makeChecklistCategory({ id: 3, name: 'C' }),
    ],
  };

  async function mounted() {
    vi.mocked(getChecklistTemplate).mockResolvedValue(twoCategories);
    const view = renderHook(() => useTemplateData());
    await waitFor(() => expect(view.result.current.template).not.toBeNull());
    return view;
  }

  it('shows the new order immediately and saves it', async () => {
    vi.mocked(reorderTemplateCategories).mockResolvedValue();
    const { result } = await mounted();

    await act(() => result.current.reorderCategories(1, 3));

    expect(result.current.template?.categories.map(c => c.id)).toEqual([
      2, 3, 1,
    ]);
    expect(reorderTemplateCategories).toHaveBeenCalledWith([2, 3, 1]);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('reloads the stored order and reports the failure when saving fails', async () => {
    vi.mocked(reorderTemplateCategories).mockRejectedValue(new Error('boom'));
    const { result } = await mounted();

    await act(() => result.current.reorderCategories(1, 3));

    expect(showToast).toHaveBeenCalledWith(
      'error',
      '調整分類順序失敗，請稍後再試',
    );
    expect(getChecklistTemplate).toHaveBeenCalledTimes(2);
    expect(result.current.template?.categories.map(c => c.id)).toEqual([
      1, 2, 3,
    ]);
  });

  it.each([
    { description: 'both ids are equal', active: 2, over: 2 },
    { description: 'an id is unknown', active: 2, over: 9 },
  ])('does nothing when $description', async ({ active, over }) => {
    const { result } = await mounted();

    await act(() => result.current.reorderCategories(active, over));

    expect(reorderTemplateCategories).not.toHaveBeenCalled();
  });

  it('does nothing before the template has loaded', async () => {
    vi.mocked(getChecklistTemplate).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTemplateData());

    await act(() => result.current.reorderCategories(1, 2));

    expect(reorderTemplateCategories).not.toHaveBeenCalled();
  });
});
