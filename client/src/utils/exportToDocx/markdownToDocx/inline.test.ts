import { describe, expect, it, vi } from 'vitest';

import { textRun } from '@/test-utils/docx';

import { parseMarkdownContent } from '../markdownToDocx';

import { codeRun, linkText, paragraph } from './testHelpers';

vi.mock('docx');

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
});
