import { Paragraph } from 'docx';
import type { Definition, Root, RootContent } from 'mdast';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { renderBlocks } from './markdownToDocx/block';
import type { BlockChild, DefinitionMap } from './markdownToDocx/shared';

// ---------------------------------------------------------------------------
// Markdown → docx
//
// Parsing goes through the same remark pipeline the UI uses in
// `components/MarkdownContent.tsx`, so what Word shows matches what the card
// preview shows. The resulting mdast tree is walked into docx primitives by
// the renderers under `./markdownToDocx/` (inline runs, blocks, lists/tables).
// ---------------------------------------------------------------------------

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkBreaks);

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
