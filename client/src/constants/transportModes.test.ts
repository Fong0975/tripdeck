import { TRANSPORT_MODES, type TransportMode } from '@tripdeck/shared';
import { describe, expect, it } from 'vitest';

import {
  getTransportModeMeta,
  TRANSPORT_MODE_META,
  TRANSPORT_MODE_OPTIONS,
} from './transportModes';

describe('TRANSPORT_MODE_META', () => {
  it.each(TRANSPORT_MODES)('has an icon and label for "%s"', mode => {
    expect(TRANSPORT_MODE_META[mode].icon).toBeTruthy();
    expect(TRANSPORT_MODE_META[mode].label).toBeTruthy();
  });
});

describe('TRANSPORT_MODE_OPTIONS', () => {
  it('lists every transport mode in the shared order', () => {
    expect(TRANSPORT_MODE_OPTIONS.map(o => o.value)).toEqual([
      ...TRANSPORT_MODES,
    ]);
  });

  it.each(TRANSPORT_MODES)(
    'includes an option for "%s" matching its meta entry',
    mode => {
      const option = TRANSPORT_MODE_OPTIONS.find(o => o.value === mode);

      expect(option).toEqual({ value: mode, ...TRANSPORT_MODE_META[mode] });
    },
  );
});

describe('getTransportModeMeta', () => {
  it.each([
    { name: 'known mode', mode: 'walk', expected: TRANSPORT_MODE_META.walk },
    {
      name: 'the "other" mode',
      mode: 'other',
      expected: TRANSPORT_MODE_META.other,
    },
    { name: 'null', mode: null, expected: TRANSPORT_MODE_META.other },
    {
      name: 'an unrecognised legacy value',
      mode: 'boat' as unknown as TransportMode,
      expected: TRANSPORT_MODE_META.other,
    },
    {
      name: 'an inherited object key',
      mode: 'toString' as unknown as TransportMode,
      expected: TRANSPORT_MODE_META.other,
    },
  ] as { name: string; mode: TransportMode | null; expected: unknown }[])(
    'returns the right meta for $name',
    ({ mode, expected }) => {
      expect(getTransportModeMeta(mode)).toEqual(expected);
    },
  );
});
