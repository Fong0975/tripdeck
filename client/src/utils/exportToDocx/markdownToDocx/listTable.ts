import {
  AlignmentType,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
} from 'docx';
import type { AlignType, List, ListItem, Table as MarkdownTable } from 'mdast';

import {
  ALL_BORDERS,
  CELL_BORDER,
  INDENT_STEP,
  QUOTE_BORDER,
  TABLE_HEADER_SHADING,
} from '../constants';
import { textRun, uniformTableBorders } from '../docxPrimitives';

import { renderInline } from './inline';
import {
  BLOCK_SPACING,
  type BlockChild,
  type BlockContext,
  type InlineChild,
  type RenderBlocks,
} from './shared';

// ---------------------------------------------------------------------------
// Lists and GFM tables
// ---------------------------------------------------------------------------

const TABLE_CELL_SPACING = { before: 20, after: 20 } as const;
const TABLE_CELL_MARGINS = {
  top: 80,
  bottom: 80,
  left: 120,
  right: 120,
} as const;

/**
 * Renders a markdown list, one or more docx paragraphs per item.
 *
 * @param node - The mdast list.
 * @param ctx - Nesting state of the enclosing blocks.
 * @param renderBlocks - Block renderer for item content beyond the first
 *   paragraph; injected so this module does not import the block renderer
 *   that already imports it.
 */
export function renderList(
  node: List,
  ctx: BlockContext,
  renderBlocks: RenderBlocks,
): BlockChild[] {
  const start = node.start ?? 1;

  return node.children.flatMap((item, index) =>
    renderListItem(
      item,
      node.ordered === true,
      start + index,
      ctx,
      renderBlocks,
    ),
  );
}

function renderListItem(
  item: ListItem,
  ordered: boolean,
  ordinal: number,
  ctx: BlockContext,
  renderBlocks: RenderBlocks,
): BlockChild[] {
  // Bulleted items rely on docx's own numbering indentation; ordered items are
  // rendered with a literal "N. " prefix, so they indent themselves.
  const itemIndent = ctx.indent + INDENT_STEP;
  const marker = ordered
    ? { indent: { left: itemIndent } }
    : { bullet: { level: ctx.listLevel } };

  const prefix: InlineChild[] = [];
  if (ordered) {
    prefix.push(textRun(`${ordinal}. `));
  }
  if (typeof item.checked === 'boolean') {
    prefix.push(textRun(item.checked ? '☑ ' : '☐ '));
  }

  const restCtx: BlockContext = {
    ...ctx,
    listLevel: ctx.listLevel + 1,
    indent: itemIndent,
  };

  const [first, ...rest] = item.children;

  // The marker has to ride along with the item's own first paragraph; an item
  // that opens with any other block gets it as a standalone line instead.
  if (first?.type === 'paragraph') {
    return [
      new Paragraph({
        children: [
          ...prefix,
          ...renderInline(first.children, ctx.baseStyle, ctx.definitions),
        ],
        spacing: BLOCK_SPACING,
        ...marker,
        ...(ctx.quote ? { border: { left: QUOTE_BORDER } } : {}),
      }),
      ...renderBlocks(rest, restCtx),
    ];
  }

  return [
    ...(prefix.length > 0
      ? [new Paragraph({ children: prefix, spacing: BLOCK_SPACING, ...marker })]
      : []),
    ...renderBlocks(item.children, restCtx),
  ];
}

const ALIGNMENTS: Record<
  string,
  (typeof AlignmentType)[keyof typeof AlignmentType]
> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
};

/**
 * Renders a GFM table as a full-width docx table with a shaded, bold header
 * row and per-column alignment.
 *
 * @param node - The mdast table.
 * @param ctx - Nesting state of the enclosing blocks.
 */
export function renderTable(node: MarkdownTable, ctx: BlockContext): Table {
  const align: readonly (AlignType | null | undefined)[] = node.align ?? [];

  const rows = node.children.map(
    (row, rowIndex) =>
      new TableRow({
        children: row.children.map((cell, colIndex) => {
          const alignment = ALIGNMENTS[align[colIndex] ?? ''];
          return new TableCell({
            borders: ALL_BORDERS,
            margins: TABLE_CELL_MARGINS,
            ...(rowIndex === 0 ? { shading: TABLE_HEADER_SHADING } : {}),
            children: [
              new Paragraph({
                children: renderInline(
                  cell.children,
                  rowIndex === 0
                    ? { ...ctx.baseStyle, bold: true }
                    : ctx.baseStyle,
                  ctx.definitions,
                ),
                spacing: TABLE_CELL_SPACING,
                ...(alignment ? { alignment } : {}),
              }),
            ],
          });
        }),
      }),
  );

  return new Table({
    // Percentage width keeps the table inside the fixed-width (DXA) cells of
    // the attraction and transport tables it may be nested in.
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: uniformTableBorders(CELL_BORDER),
    rows,
  });
}
