import { ExternalHyperlink, TextRun } from 'docx';
import type { PhrasingContent } from 'mdast';

import { CODE_SHADING, FONT, MONO_FONT } from '../constants';

import type { DefinitionMap, InlineChild, RunStyle } from './shared';

// ---------------------------------------------------------------------------
// Inline nodes → TextRun / ExternalHyperlink
// ---------------------------------------------------------------------------

/**
 * Converts an accumulated {@link RunStyle} into docx run options in the body
 * font, omitting every flag that is not set.
 *
 * @param style - The inherited character formatting.
 */
export function runOptions(style: RunStyle) {
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

/**
 * Renders mdast phrasing content into docx runs and hyperlinks.
 *
 * @param nodes - Inline mdast nodes.
 * @param style - Formatting inherited from enclosing nodes.
 * @param definitions - Definitions used to resolve link/image references.
 * @returns The docx inline children, in source order.
 */
export function renderInline(
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
