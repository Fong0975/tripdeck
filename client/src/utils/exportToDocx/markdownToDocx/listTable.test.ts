import { describe, expect, it, vi } from 'vitest';

import { textRun } from '@/test-utils/docx';

import { QUOTE_BORDER, TABLE_HEADER_SHADING } from '../constants';
import { parseMarkdownContent } from '../markdownToDocx';

import {
  HEADING_SPACING,
  TABLE_BORDERS,
  paragraph,
  tableCell,
  type MockTable,
} from './testHelpers';

vi.mock('docx');

describe('parseMarkdownContent', () => {
  describe('lists', () => {
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
    ])('renders $description', ({ input, expected }) => {
      expect(parseMarkdownContent(input)).toEqual(expected);
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
