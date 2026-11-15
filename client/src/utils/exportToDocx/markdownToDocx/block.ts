import { Paragraph, TextRun } from 'docx';
import type { RootContent } from 'mdast';

import {
  CODE_SHADING,
  HEADING_SIZES,
  HR_BORDER,
  INDENT_STEP,
  MONO_FONT,
  QUOTE_BORDER,
} from '../constants';

import { renderInline, runOptions } from './inline';
import { renderList, renderTable } from './listTable';
import { BLOCK_SPACING, type BlockChild, type BlockContext } from './shared';

// ---------------------------------------------------------------------------
// Block nodes → Paragraph / Table
// ---------------------------------------------------------------------------

const HEADING_SPACING = { before: 80, after: 40 } as const;
const RULE_SPACING = { before: 80, after: 80 } as const;
const CODE_SPACING = { before: 0, after: 0 } as const;
const CODE_SIZE = 20;

/** Indent + quote decoration shared by every non-bulleted block. */
function paragraphFrame(ctx: BlockContext) {
  return {
    ...(ctx.indent > 0 ? { indent: { left: ctx.indent } } : {}),
    ...(ctx.quote ? { border: { left: QUOTE_BORDER } } : {}),
  };
}

/**
 * Renders a sequence of mdast block nodes into docx paragraphs and tables.
 *
 * @param nodes - Block-level mdast nodes.
 * @param ctx - Nesting state (list level, indent, quote, inherited style).
 * @returns The docx blocks, in source order.
 */
export function renderBlocks(
  nodes: readonly RootContent[],
  ctx: BlockContext,
): BlockChild[] {
  return nodes.flatMap(node => renderBlock(node, ctx));
}

function renderBlock(node: RootContent, ctx: BlockContext): BlockChild[] {
  switch (node.type) {
    case 'paragraph':
      return [
        new Paragraph({
          children: renderInline(node.children, ctx.baseStyle, ctx.definitions),
          spacing: BLOCK_SPACING,
          ...paragraphFrame(ctx),
        }),
      ];

    case 'heading':
      return [
        new Paragraph({
          children: renderInline(
            node.children,
            {
              ...ctx.baseStyle,
              bold: true,
              size: HEADING_SIZES[node.depth - 1],
            },
            ctx.definitions,
          ),
          spacing: HEADING_SPACING,
          ...paragraphFrame(ctx),
        }),
      ];

    case 'list':
      return renderList(node, ctx, renderBlocks);

    case 'blockquote':
      return renderBlocks(node.children, {
        ...ctx,
        quote: true,
        indent: ctx.indent + INDENT_STEP,
        baseStyle: { ...ctx.baseStyle, italics: true },
      });

    case 'code':
      return node.value.split('\n').map(
        line =>
          new Paragraph({
            children: line
              ? [
                  new TextRun({
                    text: line,
                    font: MONO_FONT,
                    size: CODE_SIZE,
                    shading: CODE_SHADING,
                  }),
                ]
              : [],
            spacing: CODE_SPACING,
            ...paragraphFrame(ctx),
          }),
      );

    case 'thematicBreak':
      return [
        new Paragraph({
          children: [],
          border: { bottom: HR_BORDER },
          spacing: RULE_SPACING,
        }),
      ];

    case 'table':
      return [renderTable(node, ctx)];

    case 'html':
      return [
        new Paragraph({
          children: [
            new TextRun({ text: node.value, ...runOptions(ctx.baseStyle) }),
          ],
          spacing: BLOCK_SPACING,
          ...paragraphFrame(ctx),
        }),
      ];

    // Reference targets carry no visible content of their own.
    default:
      return [];
  }
}
