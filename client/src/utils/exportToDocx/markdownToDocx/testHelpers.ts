import { textRun } from '@/test-utils/docx';

import {
  ALL_BORDERS,
  CELL_BORDER,
  CODE_SHADING,
  MONO_FONT,
} from '../constants';

/**
 * Expected-shape builders shared by the markdown → docx renderer tests. They
 * mirror the `{ type, options }` objects produced by the `docx` manual mock,
 * so they are only meaningful in test files that call `vi.mock('docx')`.
 */

const BLOCK_SPACING = { before: 40, after: 40 };
export const HEADING_SPACING = { before: 80, after: 40 };
const CELL_SPACING = { before: 20, after: 20 };
export const TABLE_BORDERS = {
  top: CELL_BORDER,
  bottom: CELL_BORDER,
  left: CELL_BORDER,
  right: CELL_BORDER,
  insideHorizontal: CELL_BORDER,
  insideVertical: CELL_BORDER,
};
const TABLE_CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };

/** Shape of the mocked `Table` tree, for targeted assertions. */
export interface MockTable {
  options: {
    rows: {
      options: {
        children: {
          options: { children: { options: { alignment?: string } }[] };
        }[];
      };
    }[];
  };
}

/** Expected inline/fenced code run in the monospace font. */
export function codeRun(text: string, extra: Record<string, unknown> = {}) {
  return {
    type: 'TextRun',
    options: { text, font: MONO_FONT, shading: CODE_SHADING, ...extra },
  };
}

function link(url: string, children: unknown[]) {
  return { type: 'ExternalHyperlink', options: { link: url, children } };
}

/** Expected hyperlink wrapping a single Hyperlink-styled run. */
export function linkText(
  text: string,
  url: string,
  extra: Record<string, unknown> = {},
) {
  return link(url, [textRun(text, { style: 'Hyperlink', ...extra })]);
}

/** Expected body paragraph with the default block spacing. */
export function paragraph(
  children: unknown[],
  extra: Record<string, unknown> = {},
) {
  return {
    type: 'Paragraph',
    options: { children, spacing: BLOCK_SPACING, ...extra },
  };
}

/** Expected GFM table cell holding one paragraph of `children`. */
export function tableCell(
  children: unknown[],
  { alignment, ...cell }: { alignment?: string; shading?: unknown } = {},
) {
  return {
    type: 'TableCell',
    options: {
      borders: ALL_BORDERS,
      margins: TABLE_CELL_MARGINS,
      ...cell,
      children: [
        {
          type: 'Paragraph',
          options: {
            children,
            spacing: CELL_SPACING,
            ...(alignment ? { alignment } : {}),
          },
        },
      ],
    },
  };
}
