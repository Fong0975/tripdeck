import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { hasEditChanges, useTrackedEditState } from './useTrackedEditState';

describe('hasEditChanges', () => {
  it.each([
    {
      description: 'identical trees',
      baseline: { name: 'A', items: [{ id: 1 }] },
      current: { name: 'A', items: [{ id: 1 }] },
      expected: false,
    },
    {
      description: 'a changed field',
      baseline: { name: 'A', items: [] },
      current: { name: 'B', items: [] },
      expected: true,
    },
    {
      description: 'an added entry',
      baseline: { name: 'A', items: [] },
      current: { name: 'A', items: [{ id: -1 }] },
      expected: true,
    },
    {
      description: 'an entry flagged as deleted',
      baseline: { name: 'A', items: [{ id: 1 }] },
      current: { name: 'A', items: [{ id: 1, _deleted: true }] },
      expected: true,
    },
  ])(
    'returns $expected for $description',
    ({ baseline, current, expected }) => {
      expect(hasEditChanges<unknown>(baseline, current)).toBe(expected);
    },
  );
});

describe('useTrackedEditState', () => {
  it.each([
    { description: 'untouched', values: [], expectedDirty: false },
    { description: 'changed', values: ['B'], expectedDirty: true },
    {
      description: 'changed and then reverted',
      values: ['B', 'A'],
      expectedDirty: false,
    },
  ])(
    'reports dirty=$expectedDirty when $description',
    ({ values, expectedDirty }) => {
      const { result } = renderHook(() =>
        useTrackedEditState(() => ({ name: 'A' })),
      );

      for (const name of values) {
        act(() => result.current[1]({ name }));
      }

      expect(result.current[2]).toBe(expectedDirty);
    },
  );
});
