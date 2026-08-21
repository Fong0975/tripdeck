import { describe, expect, it, vi } from 'vitest';

import { FONT } from './constants';
import { parseInline, parseMarkdownContent } from './markdownToDocx';

// `docx` builds a nested XML component tree that isn't practical to assert
// against directly (see the plan's Phase 2 notes). Mock the constructors used
// by markdownToDocx.ts so each call is captured as a plain, comparable object
// instead. `BorderStyle` is also mocked because `./constants` reads it at
// module-init time (docx is mocked module-wide, not just the symbols below).
// These constructors are invoked with `new`, so their mock implementation
// must be a real `function` — an arrow function cannot be used as a
// constructor target and would throw when Vitest calls it via `new`.
vi.mock('docx', () => ({
  BorderStyle: { NONE: 'none', SINGLE: 'single' },
  TextRun: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'TextRun', options };
  }),
  ExternalHyperlink: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'ExternalHyperlink', options };
  }),
  Paragraph: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'Paragraph', options };
  }),
}));

function textRun(text: string, extra: Record<string, unknown> = {}) {
  return { type: 'TextRun', options: { text, font: FONT, ...extra } };
}

function link(text: string, url: string) {
  return {
    type: 'ExternalHyperlink',
    options: {
      link: url,
      children: [textRun(text, { style: 'Hyperlink' })],
    },
  };
}

function paragraph(children: unknown[], extra: Record<string, unknown> = {}) {
  return {
    type: 'Paragraph',
    options: { children, spacing: { before: 40, after: 40 }, ...extra },
  };
}

describe('parseInline', () => {
  it.each([
    { input: '', expected: [], description: 'empty string' },
    {
      input: 'Hello',
      expected: [textRun('Hello')],
      description: 'plain text only',
    },
    {
      input: '**Bold**',
      expected: [textRun('Bold', { bold: true })],
      description: 'bold text',
    },
    {
      input: '[Click](https://example.com)',
      expected: [link('Click', 'https://example.com')],
      description: 'link',
    },
    {
      input: 'A **B** C',
      expected: [textRun('A '), textRun('B', { bold: true }), textRun(' C')],
      description: 'mixed plain and bold text',
    },
    {
      input: '**oops',
      expected: [textRun('*'), textRun('*oops')],
      description: 'unclosed bold delimiter falls back to literal asterisks',
    },
    {
      input: '[oops',
      expected: [textRun('['), textRun('oops')],
      description: 'unclosed link bracket falls back to a literal bracket',
    },
    {
      input: '**B**[L](u)',
      expected: [textRun('B', { bold: true }), link('L', 'u')],
      description: 'bold run immediately followed by a link',
    },
  ])('returns the expected runs for $description', ({ input, expected }) => {
    expect(parseInline(input)).toEqual(expected);
  });
});

describe('parseMarkdownContent', () => {
  it.each([
    {
      description: 'plain text line',
      input: 'Hello world',
      expected: [paragraph([textRun('Hello world')])],
    },
    {
      description: 'bold inline text',
      input: '**Bold**',
      expected: [paragraph([textRun('Bold', { bold: true })])],
    },
    {
      description: 'link inline text',
      input: '[Click](https://example.com)',
      expected: [paragraph([link('Click', 'https://example.com')])],
    },
    {
      description: 'mixed plain and bold text',
      input: 'Hello **bold** world',
      expected: [
        paragraph([
          textRun('Hello '),
          textRun('bold', { bold: true }),
          textRun(' world'),
        ]),
      ],
    },
    {
      description: 'unclosed bold delimiter falls back to literal asterisks',
      input: '**oops',
      expected: [paragraph([textRun('*'), textRun('*oops')])],
    },
    {
      description: 'h1 heading',
      input: '# Title',
      expected: [
        paragraph([textRun('Title', { bold: true, size: 28 })], {
          spacing: { before: 80, after: 40 },
        }),
      ],
    },
    {
      description: 'h2 heading',
      input: '## Title',
      expected: [
        paragraph([textRun('Title', { bold: true, size: 26 })], {
          spacing: { before: 80, after: 40 },
        }),
      ],
    },
    {
      description: 'h3 heading',
      input: '### Title',
      expected: [
        paragraph([textRun('Title', { bold: true, size: 24 })], {
          spacing: { before: 80, after: 40 },
        }),
      ],
    },
    {
      description: 'dash bullet list item',
      input: '- Item',
      expected: [paragraph([textRun('Item')], { bullet: { level: 0 } })],
    },
    {
      description: 'asterisk bullet list item',
      input: '* Item',
      expected: [paragraph([textRun('Item')], { bullet: { level: 0 } })],
    },
    {
      description: 'ordered list item',
      input: '1. Item',
      expected: [paragraph([textRun('1. '), textRun('Item')])],
    },
    {
      description: 'double-digit ordered list item',
      input: '12. Item',
      expected: [paragraph([textRun('12. '), textRun('Item')])],
    },
    {
      description: 'blank line',
      input: '',
      expected: [paragraph([], { spacing: { before: 20, after: 20 } })],
    },
    {
      description: 'horizontal rule',
      input: '---',
      expected: [paragraph([], { spacing: { before: 20, after: 20 } })],
    },
    {
      description: 'multiple lines produce multiple paragraphs in order',
      input: 'Hello\n- Item',
      expected: [
        paragraph([textRun('Hello')]),
        paragraph([textRun('Item')], { bullet: { level: 0 } }),
      ],
    },
  ])(
    'returns the expected paragraphs for $description',
    ({ input, expected }) => {
      expect(parseMarkdownContent(input)).toEqual(expected);
    },
  );
});
