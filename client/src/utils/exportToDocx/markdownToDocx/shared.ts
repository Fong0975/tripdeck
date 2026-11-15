import type { ExternalHyperlink, Paragraph, Table, TextRun } from 'docx';
import type { Definition, RootContent } from 'mdast';

/** A docx node that can sit inside a paragraph. */
export type InlineChild = TextRun | ExternalHyperlink;
/** A docx node that can sit directly in a section or table cell. */
export type BlockChild = Paragraph | Table;
/** Link/image reference definitions, keyed by normalized identifier. */
export type DefinitionMap = ReadonlyMap<string, Definition>;

/** Character formatting accumulated while descending through inline nodes. */
export interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  strike?: boolean;
  size?: number;
  hyperlink?: boolean;
}

/** Positional state accumulated while descending through block nodes. */
export interface BlockContext {
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

/** Renders a sequence of mdast block nodes under the given context. */
export type RenderBlocks = (
  nodes: readonly RootContent[],
  ctx: BlockContext,
) => BlockChild[];

/** Paragraph spacing shared by body paragraphs and list items. */
export const BLOCK_SPACING = { before: 40, after: 40 } as const;
