import { BorderStyle } from 'docx';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

// A4 content width: 210mm - 2×25.4mm margins = 159.2mm ≈ 9026 twips
export const CONTENT_WIDTH_DXA = 9026;

// Image sizing (pixels at 96 dpi — docx.js converts internally)
export const CONTENT_WIDTH_PX = 602;
export const HALF_WIDTH_PX = Math.ceil(CONTENT_WIDTH_PX / 2) + 1;

export const FONT = 'Microsoft JhengHei';

// Attraction table: 4 equal columns [25% | 25% | 25% | 25%]
export const COL_W = Math.round(CONTENT_WIDTH_DXA / 4); // 2257 — single column
export const COL_2L = COL_W * 2; // 4514 — left 2 cols (time)
export const COL_2R = CONTENT_WIDTH_DXA - COL_2L; // 4512 — right 2 cols (maps)
export const COL_3R = CONTENT_WIDTH_DXA - COL_W; // 6769 — right 3 cols (value)

// ---------------------------------------------------------------------------
// Border presets
// ---------------------------------------------------------------------------

export const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'auto',
  space: 0,
} as const;

export const CELL_BORDER = {
  style: BorderStyle.SINGLE,
  size: 6,
  color: '000000',
  space: 0,
} as const;

export const TRANSPORT_BORDER = {
  style: BorderStyle.SINGLE,
  size: 18,
  color: '60A5FA',
  space: 0,
} as const;

export const ALL_BORDERS = {
  top: CELL_BORDER,
  bottom: CELL_BORDER,
  left: CELL_BORDER,
  right: CELL_BORDER,
} as const;
