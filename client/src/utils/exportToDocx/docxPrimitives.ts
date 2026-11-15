import {
  type IBorderOptions,
  type IRunOptions,
  type ITableCellOptions,
  TableCell,
  TextRun,
  WidthType,
} from 'docx';

import { ALL_BORDERS, FONT } from './constants';

/** Horizontal padding (twips) inside every bordered cell. */
const CELL_PADDING_X = 160;

/**
 * Builds a text run in the document body font.
 *
 * @param value - The run's text.
 * @param options - Extra run formatting (bold, size, style, …); the font is
 *   always forced to {@link FONT}.
 */
export function textRun(
  value: string,
  options: Omit<IRunOptions, 'text' | 'font'> = {},
): TextRun {
  return new TextRun({ text: value, ...options, font: FONT });
}

interface BorderedCellOptions {
  /** Cell width in twips (DXA). */
  width: number;
  /** Vertical padding (twips) applied to both the top and bottom. */
  paddingY: number;
  children: ITableCellOptions['children'];
  columnSpan?: number;
}

/**
 * Builds a fixed-width table cell with single borders on every side and the
 * standard horizontal padding, as used by the attraction table.
 *
 * @param options - Width, vertical padding, content and optional column span.
 */
export function borderedCell({
  width,
  paddingY,
  children,
  columnSpan,
}: BorderedCellOptions): TableCell {
  return new TableCell({
    ...(columnSpan === undefined ? {} : { columnSpan }),
    width: { size: width, type: WidthType.DXA },
    borders: ALL_BORDERS,
    margins: {
      top: paddingY,
      bottom: paddingY,
      left: CELL_PADDING_X,
      right: CELL_PADDING_X,
    },
    children,
  });
}

/**
 * Table-level border options that draw the same border on the outer edges and
 * between every row and column.
 *
 * @param border - The border to apply everywhere.
 */
export function uniformTableBorders(border: IBorderOptions) {
  return {
    top: border,
    bottom: border,
    left: border,
    right: border,
    insideHorizontal: border,
    insideVertical: border,
  };
}
