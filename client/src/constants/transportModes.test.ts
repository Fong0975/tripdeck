import { describe, expect, it } from 'vitest';

import type { TransportMode } from '@/types';

import { TRANSPORT_MODE_META, TRANSPORT_MODE_OPTIONS } from './transportModes';

const ALL_MODES: TransportMode[] = [
  'walk',
  'transit',
  'drive',
  'bike',
  'taxi',
  'flight',
  'other',
];

describe('TRANSPORT_MODE_META', () => {
  it.each(ALL_MODES)('has an icon and label for "%s"', mode => {
    expect(TRANSPORT_MODE_META[mode].icon).toBeTruthy();
    expect(TRANSPORT_MODE_META[mode].label).toBeTruthy();
  });
});

describe('TRANSPORT_MODE_OPTIONS', () => {
  it('has one entry per transport mode', () => {
    expect(TRANSPORT_MODE_OPTIONS).toHaveLength(ALL_MODES.length);
  });

  it.each(ALL_MODES)(
    'includes an option for "%s" matching its meta entry',
    mode => {
      const option = TRANSPORT_MODE_OPTIONS.find(o => o.value === mode);

      expect(option).toEqual({ value: mode, ...TRANSPORT_MODE_META[mode] });
    },
  );
});
