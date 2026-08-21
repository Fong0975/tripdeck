import { describe, expect, it, vi } from 'vitest';

import {
  ALL_BORDERS,
  CELL_BORDER,
  COL_2L,
  COL_2R,
  COL_3R,
  COL_W,
  CONTENT_WIDTH_DXA,
  HALF_WIDTH_PX,
  NO_BORDER,
  TRANSPORT_BORDER,
} from './constants';

// `BorderStyle` is mocked because `./constants` reads it at module-init time.
vi.mock('docx', () => ({
  BorderStyle: { NONE: 'none', SINGLE: 'single' },
}));

describe('layout constants', () => {
  it.each([
    { name: 'CONTENT_WIDTH_DXA', actual: CONTENT_WIDTH_DXA, expected: 9026 },
    { name: 'HALF_WIDTH_PX', actual: HALF_WIDTH_PX, expected: 302 },
    { name: 'COL_W', actual: COL_W, expected: 2257 },
    { name: 'COL_2L', actual: COL_2L, expected: 4514 },
    { name: 'COL_2R', actual: COL_2R, expected: 4512 },
    { name: 'COL_3R', actual: COL_3R, expected: 6769 },
  ])('computes $name as $expected', ({ actual, expected }) => {
    expect(actual).toBe(expected);
  });
});

describe('border presets', () => {
  it('reuses the CELL_BORDER reference for every side of ALL_BORDERS', () => {
    expect(ALL_BORDERS.top).toBe(CELL_BORDER);
    expect(ALL_BORDERS.bottom).toBe(CELL_BORDER);
    expect(ALL_BORDERS.left).toBe(CELL_BORDER);
    expect(ALL_BORDERS.right).toBe(CELL_BORDER);
  });

  it.each([
    { name: 'NO_BORDER', border: NO_BORDER, expectedStyle: 'none' },
    { name: 'CELL_BORDER', border: CELL_BORDER, expectedStyle: 'single' },
    {
      name: 'TRANSPORT_BORDER',
      border: TRANSPORT_BORDER,
      expectedStyle: 'single',
    },
  ])(
    'sets $name.style from the mocked BorderStyle',
    ({ border, expectedStyle }) => {
      expect(border.style).toBe(expectedStyle);
    },
  );
});
