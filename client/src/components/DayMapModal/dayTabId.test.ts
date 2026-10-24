import { describe, expect, it } from 'vitest';

import { makeDay } from '@/test-utils/fixtures';

import { dayTabId } from './dayTabId';

describe('dayTabId', () => {
  it('derives a stable id from the day id', () => {
    expect(dayTabId(makeDay({ id: 42 }))).toBe('day-map-tab-42');
  });
});
