import { describe, expect, it } from 'vitest';

import {
  DAYS_PER_IMAGE_CHOICES,
  DEFAULT_EXPORT_OPTIONS,
} from './exportOptions';

describe('exportOptions', () => {
  it('offers one to four days per image, or all of them', () => {
    expect(DAYS_PER_IMAGE_CHOICES).toEqual([1, 2, 3, 4, 'all']);
  });

  it('starts with the timeline included and a default that is a valid choice', () => {
    expect(DEFAULT_EXPORT_OPTIONS.timeline.enabled).toBe(true);
    expect(DAYS_PER_IMAGE_CHOICES).toContain(
      DEFAULT_EXPORT_OPTIONS.timeline.daysPerImage,
    );
  });

  it('starts with the day map pictures included', () => {
    expect(DEFAULT_EXPORT_OPTIONS.dayMap).toEqual({ enabled: true });
  });
});
