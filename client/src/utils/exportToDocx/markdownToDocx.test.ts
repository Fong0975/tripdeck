import { describe, expect, it, vi } from 'vitest';

import {
  ALL_BORDERS,
  CELL_BORDER,
  CODE_SHADING,
  FONT,
  HR_BORDER,
  MONO_FONT,
  QUOTE_BORDER,
  TABLE_HEADER_SHADING,
} from './constants';
import { parseMarkdownContent } from './markdownToDocx';

// `docx` builds a nested XML component tree that isn't practical to assert
// against directly. Mock the constructors so each call is captured as a plain,
// comparable object instead. `BorderStyle`/`ShadingType` are also mocked
// because `./constants` reads them at module-init time (docx is mocked
// module-wide, not just the symbols below). These constructors are invoked
// with `new`, so their mock implementation must be a real `function` — an
// arrow function cannot be used as a constructor target and would throw when
// Vitest calls it via `new`.
vi.mock('docx', () => ({
  AlignmentType: { LEFT: 'left', CENTER: 'center', RIGHT: 'right' },
  BorderStyle: { NONE: 'none', SINGLE: 'single' },
  ShadingType: { SOLID: 'solid' },
  WidthType: { DXA: 'dxa', PERCENTAGE: 'pct' },
  ExternalHyperlink: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'ExternalHyperlink', options };
  }),
  Paragraph: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'Paragraph', options };
  }),
  Table: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'Table', options };
  }),
  TableCell: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'TableCell', options };
  }),
  TableRow: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'TableRow', options };
  }),
  TextRun: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'TextRun', options };
  }),
}));

const BLOCK_SPACING = { before: 40, after: 40 };
const HEADING_SPACING = { before: 80, after: 40 };
const CELL_SPACING = { before: 20, after: 20 };
const TABLE_BORDERS = {
  top: CELL_BORDER,
  bottom: CELL_BORDER,
  left: CELL_BORDER,
  right: CELL_BORDER,
  insideHorizontal: CELL_BORDER,
  insideVertical: CELL_BORDER,
};
const TABLE_CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };

/** Shape of the mocked `Table` tree, for targeted assertions. */
interface MockTable {
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

function textRun(text: string, extra: Record<string, unknown> = {}) {
  return { type: 'TextRun', options: { text, font: FONT, ...extra } };
}

function codeRun(text: string, extra: Record<string, unknown> = {}) {
  return {
    type: 'TextRun',
    options: { text, font: MONO_FONT, shading: CODE_SHADING, ...extra },
  };
}

function link(url: string, children: unknown[]) {
  return { type: 'ExternalHyperlink', options: { link: url, children } };
}

function linkText(
  text: string,
  url: string,
  extra: Record<string, unknown> = {},
) {
  return link(url, [textRun(text, { style: 'Hyperlink', ...extra })]);
}

function paragraph(children: unknown[], extra: Record<string, unknown> = {}) {
  return {
    type: 'Paragraph',
    options: { children, spacing: BLOCK_SPACING, ...extra },
  };
}

function tableCell(
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

describe('parseMarkdownContent', () => {
  describe('inline formatting', () => {
    it.each([
      {
        description: 'plain text',
        input: 'Hello world',
        expected: [textRun('Hello world')],
      },
      {
        description: 'bold text',
        input: '**Bold**',
        expected: [textRun('Bold', { bold: true })],
      },
      {
        description: 'asterisk italic text',
        input: '*Italic*',
        expected: [textRun('Italic', { italics: true })],
      },
      {
        description: 'underscore italic text',
        input: '_Italic_',
        expected: [textRun('Italic', { italics: true })],
      },
      {
        description: 'strikethrough text',
        input: '~~gone~~',
        expected: [textRun('gone', { strike: true })],
      },
      {
        description: 'inline code in the monospace font',
        input: '`npm run dev`',
        expected: [codeRun('npm run dev')],
      },
      {
        description: 'a link',
        input: '[Click](https://example.com)',
        expected: [linkText('Click', 'https://example.com')],
      },
      {
        description: 'a bare URL autolinked by GFM',
        input: 'https://example.com',
        expected: [linkText('https://example.com', 'https://example.com')],
      },
      {
        description: 'a link nested inside bold, keeping both styles',
        input: '**[L](https://example.com)**',
        expected: [linkText('L', 'https://example.com', { bold: true })],
      },
      {
        description: 'mixed plain and bold text',
        input: 'Hello **bold** world',
        expected: [
          textRun('Hello '),
          textRun('bold', { bold: true }),
          textRun(' world'),
        ],
      },
      {
        description: 'an image as a text hyperlink rather than an embed',
        input: '![alt](https://example.com/a.png)',
        expected: [linkText('alt', 'https://example.com/a.png')],
      },
      {
        description: 'raw HTML verbatim, matching the on-screen renderer',
        input: '<div>raw</div>',
        expected: [textRun('<div>raw</div>')],
      },
      {
        description: 'an unresolvable reference as literal text',
        input: '[ref][missing]',
        expected: [textRun('[ref][missing]')],
      },
      {
        description: 'an image without alt text, falling back to its title',
        input: '![](https://example.com/a.png "T")',
        expected: [linkText('T', 'https://example.com/a.png')],
      },
      {
        description: 'an image without alt or title, falling back to its url',
        input: '![](https://example.com/a.png)',
        expected: [
          linkText('https://example.com/a.png', 'https://example.com/a.png'),
        ],
      },
    ])('renders $description', ({ input, expected }) => {
      expect(parseMarkdownContent(input)).toEqual([paragraph(expected)]);
    });

    it('turns a single newline into a soft break, as remark-breaks does', () => {
      expect(parseMarkdownContent('line1\nline2')).toEqual([
        paragraph([
          textRun('line1'),
          { type: 'TextRun', options: { break: 1 } },
          textRun('line2'),
        ]),
      ]);
    });

    it('resolves a link reference against its definition', () => {
      expect(
        parseMarkdownContent('[ref][id]\n\n[id]: https://example.com'),
      ).toEqual([paragraph([linkText('ref', 'https://example.com')])]);
    });

    it('resolves an image reference against its definition', () => {
      expect(
        parseMarkdownContent('![alt][id]\n\n[id]: https://example.com/a.png'),
      ).toEqual([paragraph([linkText('alt', 'https://example.com/a.png')])]);
    });

    it('renders a footnote reference as a superscript marker', () => {
      expect(parseMarkdownContent('text[^1]\n\n[^1]: note')).toEqual([
        paragraph([textRun('text'), textRun('[1]', { superScript: true })]),
      ]);
    });
  });

  describe('block structure', () => {
    it.each([
      { input: '# Title', size: 28 },
      { input: '## Title', size: 26 },
      { input: '### Title', size: 24 },
      { input: '#### Title', size: 24 },
      { input: '##### Title', size: 22 },
      { input: '###### Title', size: 22 },
    ])('renders $input as a bold heading run', ({ input, size }) => {
      expect(parseMarkdownContent(input)).toEqual([
        paragraph([textRun('Title', { bold: true, size })], {
          spacing: HEADING_SPACING,
        }),
      ]);
    });

    it.each([
      {
        description: 'a dash bullet',
        input: '- Item',
        expected: [paragraph([textRun('Item')], { bullet: { level: 0 } })],
      },
      {
        description: 'an asterisk bullet',
        input: '* Item',
        expected: [paragraph([textRun('Item')], { bullet: { level: 0 } })],
      },
      {
        description: 'an ordered item with a literal prefix and indent',
        input: '1. Item',
        expected: [
          paragraph([textRun('1. '), textRun('Item')], {
            indent: { left: 360 },
          }),
        ],
      },
      {
        description: 'an ordered list honouring its start value',
        input: '12. Item',
        expected: [
          paragraph([textRun('12. '), textRun('Item')], {
            indent: { left: 360 },
          }),
        ],
      },
      {
        description: 'a checked task list item',
        input: '- [x] done',
        expected: [
          paragraph([textRun('☑ '), textRun('done')], { bullet: { level: 0 } }),
        ],
      },
      {
        description: 'an unchecked task list item',
        input: '- [ ] todo',
        expected: [
          paragraph([textRun('☐ '), textRun('todo')], { bullet: { level: 0 } }),
        ],
      },
      {
        description: 'a nested bullet one level deeper',
        input: '- outer\n  - inner',
        expected: [
          paragraph([textRun('outer')], { bullet: { level: 0 } }),
          paragraph([textRun('inner')], { bullet: { level: 1 } }),
        ],
      },
      {
        description: 'a nested ordered list indented one step further',
        input: '- outer\n  1. inner',
        expected: [
          paragraph([textRun('outer')], { bullet: { level: 0 } }),
          paragraph([textRun('1. '), textRun('inner')], {
            indent: { left: 720 },
          }),
        ],
      },
      {
        description: 'consecutive paragraphs as separate blocks',
        input: 'first\n\nsecond',
        expected: [
          paragraph([textRun('first')]),
          paragraph([textRun('second')]),
        ],
      },
    ])('renders $description', ({ input, expected }) => {
      expect(parseMarkdownContent(input)).toEqual(expected);
    });

    it('renders a thematic break as a bottom-bordered paragraph', () => {
      expect(parseMarkdownContent('---')).toEqual([
        {
          type: 'Paragraph',
          options: {
            children: [],
            border: { bottom: HR_BORDER },
            spacing: { before: 80, after: 80 },
          },
        },
      ]);
    });

    it('renders a blockquote as indented, bordered, italic text', () => {
      expect(parseMarkdownContent('> quoted')).toEqual([
        paragraph([textRun('quoted', { italics: true })], {
          indent: { left: 360 },
          border: { left: QUOTE_BORDER },
        }),
      ]);
    });

    it('carries the blockquote border onto list items inside it', () => {
      expect(parseMarkdownContent('> - item')).toEqual([
        paragraph([textRun('item', { italics: true })], {
          bullet: { level: 0 },
          border: { left: QUOTE_BORDER },
        }),
      ]);
    });

    it('indents a bullet item that opens with a non-paragraph block', () => {
      expect(parseMarkdownContent('- # Heading')).toEqual([
        paragraph([textRun('Heading', { bold: true, size: 28 })], {
          spacing: HEADING_SPACING,
          indent: { left: 360 },
        }),
      ]);
    });

    it('keeps the ordinal on its own line when an ordered item opens with a non-paragraph block', () => {
      expect(parseMarkdownContent('1. # Heading')).toEqual([
        paragraph([textRun('1. ')], { indent: { left: 360 } }),
        paragraph([textRun('Heading', { bold: true, size: 28 })], {
          spacing: HEADING_SPACING,
          indent: { left: 360 },
        }),
      ]);
    });

    it('renders a fenced code block as one monospace paragraph per line', () => {
      expect(parseMarkdownContent('```\nfirst\nsecond\n```')).toEqual([
        {
          type: 'Paragraph',
          options: {
            children: [codeRun('first', { size: 20 })],
            spacing: { before: 0, after: 0 },
          },
        },
        {
          type: 'Paragraph',
          options: {
            children: [codeRun('second', { size: 20 })],
            spacing: { before: 0, after: 0 },
          },
        },
      ]);
    });

    it('drops a link definition, which has no visible content of its own', () => {
      expect(parseMarkdownContent('[id]: https://example.com')).toEqual([
        { type: 'Paragraph', options: { children: [] } },
      ]);
    });

    it('returns a single blank paragraph for empty input', () => {
      expect(parseMarkdownContent('')).toEqual([
        { type: 'Paragraph', options: { children: [] } },
      ]);
    });
  });

  describe('GFM tables', () => {
    it('renders a percentage-width docx table with a shaded bold header', () => {
      const markdown = '| A | B |\n| --- | ---: |\n| 1 | 2 |';

      expect(parseMarkdownContent(markdown)).toEqual([
        {
          type: 'Table',
          options: {
            width: { size: 100, type: 'pct' },
            borders: TABLE_BORDERS,
            rows: [
              {
                type: 'TableRow',
                options: {
                  children: [
                    tableCell([textRun('A', { bold: true })], {
                      shading: TABLE_HEADER_SHADING,
                    }),
                    tableCell([textRun('B', { bold: true })], {
                      shading: TABLE_HEADER_SHADING,
                      alignment: 'right',
                    }),
                  ],
                },
              },
              {
                type: 'TableRow',
                options: {
                  children: [
                    tableCell([textRun('1')]),
                    tableCell([textRun('2')], { alignment: 'right' }),
                  ],
                },
              },
            ],
          },
        },
      ]);
    });

    it('applies column alignment from the delimiter row', () => {
      const markdown = '| L | C | R |\n| :-- | :-: | --: |\n| a | b | c |';
      const table = parseMarkdownContent(markdown)[0] as unknown as MockTable;

      const alignments = table.options.rows[1].options.children.map(
        cell => cell.options.children[0].options.alignment,
      );

      expect(alignments).toEqual(['left', 'center', 'right']);
    });
  });
});
