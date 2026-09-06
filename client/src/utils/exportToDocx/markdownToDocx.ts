import {
  AlignmentType,
  ExternalHyperlink,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type {
  AlignType,
  Definition,
  List,
  ListItem,
  PhrasingContent,
  Root,
  RootContent,
  Table as MarkdownTable,
} from 'mdast';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import {
  ALL_BORDERS,
  CELL_BORDER,
  CODE_SHADING,
  FONT,
  HEADING_SIZES,
  HR_BORDER,
  INDENT_STEP,
  MONO_FONT,
  QUOTE_BORDER,
  TABLE_HEADER_SHADING,
} from './constants';

// ---------------------------------------------------------------------------
// Markdown → docx
//
// Parsing goes through the same remark pipeline the UI uses in
// `components/MarkdownContent.tsx`, so what Word shows matches what the card
// preview shows. The resulting mdast tree is walked into docx primitives.
// ---------------------------------------------------------------------------

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkBreaks);

type InlineChild = TextRun | ExternalHyperlink;
type BlockChild = Paragraph | Table;
type DefinitionMap = ReadonlyMap<string, Definition>;

/** Character formatting accumulated while descending through inline nodes. */
interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  size?: number;
  hyperlink?: boolean;
}

/** Positional state accumulated while descending through block nodes. */
interface BlockContext {
  /** Bullet level for list items rendered at this nesting (0 = outermost). */
  listLevel: number;
  /** Manual left indent in twips, applied to non-bulleted blocks. */
  indent: number;
  /** Whether these blocks live inside a blockquote. */
  quote: boolean;
  /** Formatting inherited from an enclosing block (e.g. blockquote italics). */
  baseStyle: RunStyle;
  definitions: DefinitionMap;
}

const BLOCK_SPACING = { before: 40, after: 40 } as const;
const HEADING_SPACING = { before: 80, after: 40 } as const;
const RULE_SPACING = { before: 80, after: 80 } as const;
const CODE_SPACING = { before: 0, after: 0 } as const;
const TABLE_CELL_SPACING = { before: 20, after: 20 } as const;
const TABLE_CELL_MARGINS = {
  top: 80,
  bottom: 80,
  left: 120,
  right: 120,
} as const;
const CODE_SIZE = 20;

/**
 * Renders a markdown string into docx blocks suitable for a table cell or a
 * document section.
 *
 * @param text - Raw markdown source.
 * @returns Paragraphs and tables; never empty, because docx rejects table
 *   cells with no children — a blank paragraph stands in for empty input.
 */
export function parseMarkdownContent(text: string): BlockChild[] {
  const tree = processor.runSync(processor.parse(text)) as Root;
  const blocks = renderBlocks(tree.children, {
    listLevel: 0,
    indent: 0,
    quote: false,
    baseStyle: {},
    definitions: collectDefinitions(tree),
  });

  return blocks.length > 0 ? blocks : [new Paragraph({ children: [] })];
}

function collectDefinitions(tree: Root): DefinitionMap {
  const definitions = new Map<string, Definition>();

  const walk = (nodes: readonly RootContent[]): void => {
    for (const node of nodes) {
      if (node.type === 'definition') {
        definitions.set(node.identifier, node);
      } else if ('children' in node) {
        walk(node.children as readonly RootContent[]);
      }
    }
  };
  walk(tree.children);

  return definitions;
}

// ---------------------------------------------------------------------------
// Inline nodes → TextRun / ExternalHyperlink
// ---------------------------------------------------------------------------

function runOptions(style: RunStyle) {
  return {
    font: FONT,
    ...(style.bold ? { bold: true } : {}),
    ...(style.italics ? { italics: true } : {}),
    ...(style.strike ? { strike: true } : {}),
    ...(style.size === undefined ? {} : { size: style.size }),
    ...(style.hyperlink ? { style: 'Hyperlink' } : {}),
  };
}

function hyperlink(url: string, children: InlineChild[]): ExternalHyperlink {
  return new ExternalHyperlink({ link: url, children });
}

function linkedText(url: string, text: string, style: RunStyle): InlineChild {
  return hyperlink(url, [
    new TextRun({ text, ...runOptions({ ...style, hyperlink: true }) }),
  ]);
}

function renderInline(
  nodes: readonly PhrasingContent[],
  style: RunStyle,
  definitions: DefinitionMap,
): InlineChild[] {
  const children: InlineChild[] = [];

  for (const node of nodes) {
    switch (node.type) {
      // Raw HTML is emitted verbatim, matching react-markdown's default of
      // turning `raw` nodes back into text instead of rendering them.
      case 'text':
      case 'html':
        children.push(new TextRun({ text: node.value, ...runOptions(style) }));
        break;

      case 'strong':
        children.push(
          ...renderInline(node.children, { ...style, bold: true }, definitions),
        );
        break;

      case 'emphasis':
        children.push(
          ...renderInline(
            node.children,
            { ...style, italics: true },
            definitions,
          ),
        );
        break;

      case 'delete':
        children.push(
          ...renderInline(
            node.children,
            { ...style, strike: true },
            definitions,
          ),
        );
        break;

      case 'inlineCode':
        children.push(
          new TextRun({
            text: node.value,
            ...runOptions(style),
            font: MONO_FONT,
            shading: CODE_SHADING,
          }),
        );
        break;

      case 'break':
        children.push(new TextRun({ break: 1 }));
        break;

      case 'link':
        children.push(
          hyperlink(
            node.url,
            renderInline(
              node.children,
              { ...style, hyperlink: true },
              definitions,
            ),
          ),
        );
        break;

      case 'linkReference': {
        /* v8 ignore next -- micromark only emits a reference node when a matching definition exists, so the undefined branch is unreachable */
        const url = definitions.get(node.identifier)?.url;
        const inner = renderInline(
          node.children,
          url ? { ...style, hyperlink: true } : style,
          definitions,
        );
        children.push(...(url ? [hyperlink(url, inner)] : inner));
        break;
      }

      // Remote images are linked, not embedded: fetching arbitrary hosts
      // during export would be slow and CORS-prone. Images attached to the
      // attraction itself still go through `imageHelpers`.
      case 'image':
        children.push(
          linkedText(node.url, node.alt || node.title || node.url, style),
        );
        break;

      case 'imageReference': {
        /* v8 ignore next 2 -- as above, a reference node always has its definition */
        const definition = definitions.get(node.identifier);
        const label = node.alt || definition?.title || node.identifier;
        children.push(
          definition
            ? linkedText(definition.url, label, style)
            : new TextRun({ text: label, ...runOptions(style) }),
        );
        break;
      }

      case 'footnoteReference':
        children.push(
          new TextRun({
            text: `[${node.label ?? node.identifier}]`,
            ...runOptions(style),
            superScript: true,
          }),
        );
        break;

      /* v8 ignore next 12 -- defensive: remark-gfm emits no other inline node types, so nothing reaches this today */
      default: {
        const other = node as {
          value?: string;
          children?: PhrasingContent[];
        };
        if (other.children) {
          children.push(...renderInline(other.children, style, definitions));
        } else if (typeof other.value === 'string') {
          children.push(
            new TextRun({ text: other.value, ...runOptions(style) }),
          );
        }
        break;
      }
    }
  }

  return children;
}

// ---------------------------------------------------------------------------
// Block nodes → Paragraph / Table
// ---------------------------------------------------------------------------

/** Indent + quote decoration shared by every non-bulleted block. */
function paragraphFrame(ctx: BlockContext) {
  return {
    ...(ctx.indent > 0 ? { indent: { left: ctx.indent } } : {}),
    ...(ctx.quote ? { border: { left: QUOTE_BORDER } } : {}),
  };
}

function renderBlocks(
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
      return renderList(node, ctx);

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

function renderList(node: List, ctx: BlockContext): BlockChild[] {
  const start = node.start ?? 1;

  return node.children.flatMap((item, index) =>
    renderListItem(item, node.ordered === true, start + index, ctx),
  );
}

function renderListItem(
  item: ListItem,
  ordered: boolean,
  ordinal: number,
  ctx: BlockContext,
): BlockChild[] {
  // Bulleted items rely on docx's own numbering indentation; ordered items are
  // rendered with a literal "N. " prefix, so they indent themselves.
  const itemIndent = ctx.indent + INDENT_STEP;
  const marker = ordered
    ? { indent: { left: itemIndent } }
    : { bullet: { level: ctx.listLevel } };

  const prefix: InlineChild[] = [];
  if (ordered) {
    prefix.push(new TextRun({ text: `${ordinal}. `, font: FONT }));
  }
  if (typeof item.checked === 'boolean') {
    prefix.push(new TextRun({ text: item.checked ? '☑ ' : '☐ ', font: FONT }));
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

function renderTable(node: MarkdownTable, ctx: BlockContext): Table {
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
    borders: {
      top: CELL_BORDER,
      bottom: CELL_BORDER,
      left: CELL_BORDER,
      right: CELL_BORDER,
      insideHorizontal: CELL_BORDER,
      insideVertical: CELL_BORDER,
    },
    rows,
  });
}
