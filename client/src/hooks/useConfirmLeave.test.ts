import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useConfirmLeave } from './useConfirmLeave';

type Hook = ReturnType<typeof useConfirmLeave>;

describe('useConfirmLeave', () => {
  it.each([
    {
      description: 'guardedLeave leaves immediately when clean',
      isDirty: false,
      steps: [(h: Hook) => h.guardedLeave()],
      expectedConfirm: false,
      expectedLeaves: 1,
    },
    {
      description: 'guardedLeave asks first when dirty',
      isDirty: true,
      steps: [(h: Hook) => h.guardedLeave()],
      expectedConfirm: true,
      expectedLeaves: 0,
    },
    {
      description: 'requestLeaveConfirm asks even when clean',
      isDirty: false,
      steps: [(h: Hook) => h.requestLeaveConfirm()],
      expectedConfirm: true,
      expectedLeaves: 0,
    },
    {
      description: 'confirmLeave hides the confirmation and leaves',
      isDirty: true,
      steps: [(h: Hook) => h.guardedLeave(), (h: Hook) => h.confirmLeave()],
      expectedConfirm: false,
      expectedLeaves: 1,
    },
    {
      description: 'cancelLeave hides the confirmation without leaving',
      isDirty: true,
      steps: [(h: Hook) => h.guardedLeave(), (h: Hook) => h.cancelLeave()],
      expectedConfirm: false,
      expectedLeaves: 0,
    },
  ])('$description', ({ isDirty, steps, expectedConfirm, expectedLeaves }) => {
    const onLeave = vi.fn();
    const { result } = renderHook(() => useConfirmLeave(isDirty, onLeave));

    for (const step of steps) {
      act(() => step(result.current));
    }

    expect(result.current.showLeaveConfirm).toBe(expectedConfirm);
    expect(onLeave).toHaveBeenCalledTimes(expectedLeaves);
  });

  it('keeps requestLeaveConfirm referentially stable across renders', () => {
    const { result, rerender } = renderHook(() =>
      useConfirmLeave(true, vi.fn()),
    );
    const first = result.current.requestLeaveConfirm;

    rerender();

    expect(result.current.requestLeaveConfirm).toBe(first);
  });
});
