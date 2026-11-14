import { describe, expect, it, vi } from 'vitest';

import { parseMarkdownContent } from './markdownToDocx';

vi.mock('docx');

// Per-node rendering is covered next to each renderer under
// `./markdownToDocx/`; this file covers the entry point's own behaviour.
describe('parseMarkdownContent', () => {
  it.each([
    { description: 'empty input', input: '' },
    {
      description: 'a lone link definition, which has no visible content',
      input: '[id]: https://example.com',
    },
  ])('returns a single blank paragraph for $description', ({ input }) => {
    expect(parseMarkdownContent(input)).toEqual([
      { type: 'Paragraph', options: { children: [] } },
    ]);
  });
});
