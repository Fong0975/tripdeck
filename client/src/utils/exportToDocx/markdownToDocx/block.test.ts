import { describe, expect, it, vi } from 'vitest';

import { textRun } from '@/test-utils/docx';

import { HR_BORDER, QUOTE_BORDER } from '../constants';
import { parseMarkdownContent } from '../markdownToDocx';

import { HEADING_SPACING, codeRun, paragraph } from './testHelpers';

vi.mock('docx');

describe('parseMarkdownContent', () => {
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

    it('renders consecutive paragraphs as separate blocks', () => {
      expect(parseMarkdownContent('first\n\nsecond')).toEqual([
        paragraph([textRun('first')]),
        paragraph([textRun('second')]),
      ]);
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
  });
});
