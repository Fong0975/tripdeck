import { ExternalHyperlink, Paragraph, TextRun } from 'docx';

import { FONT } from './constants';

// ---------------------------------------------------------------------------
// Inline markdown parser: **bold**, [text](url), plain text
// ---------------------------------------------------------------------------

type InlineChild = TextRun | ExternalHyperlink;

export function parseInline(text: string): InlineChild[] {
  const result: InlineChild[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      result.push(new TextRun({ text: boldMatch[1], bold: true, font: FONT }));
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      result.push(
        new ExternalHyperlink({
          link: linkMatch[2],
          children: [
            new TextRun({ text: linkMatch[1], style: 'Hyperlink', font: FONT }),
          ],
        }),
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    const nextSpecial = remaining.search(/\*\*|\[/);
    if (nextSpecial === -1) {
      result.push(new TextRun({ text: remaining, font: FONT }));
      remaining = '';
    } else if (nextSpecial === 0) {
      result.push(new TextRun({ text: remaining[0], font: FONT }));
      remaining = remaining.slice(1);
    } else {
      result.push(
        new TextRun({ text: remaining.slice(0, nextSpecial), font: FONT }),
      );
      remaining = remaining.slice(nextSpecial);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Markdown block parser → Paragraph[] (for use inside table cells)
// ---------------------------------------------------------------------------

export function parseMarkdownContent(text: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const line of text.split('\n')) {
    if (line.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.slice(4),
              bold: true,
              size: 24,
              font: FONT,
            }),
          ],
          spacing: { before: 80, after: 40 },
        }),
      );
    } else if (line.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.slice(3),
              bold: true,
              size: 26,
              font: FONT,
            }),
          ],
          spacing: { before: 80, after: 40 },
        }),
      );
    } else if (line.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.slice(2),
              bold: true,
              size: 28,
              font: FONT,
            }),
          ],
          spacing: { before: 80, after: 40 },
        }),
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      paragraphs.push(
        new Paragraph({
          children: parseInline(line.slice(2)),
          bullet: { level: 0 },
          spacing: { before: 40, after: 40 },
        }),
      );
    } else if (/^\d+\. /.test(line)) {
      const m = line.match(/^(\d+)\. (.*)/);
      paragraphs.push(
        new Paragraph({
          children: [
            /* v8 ignore next 2 -- the `/^\d+\. /` test above guarantees these capture groups exist */
            new TextRun({ text: `${m?.[1] ?? '1'}. `, font: FONT }),
            ...parseInline(m?.[2] ?? line),
          ],
          spacing: { before: 40, after: 40 },
        }),
      );
    } else if (line.trim() === '' || line === '---') {
      paragraphs.push(
        new Paragraph({ children: [], spacing: { before: 20, after: 20 } }),
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: parseInline(line),
          spacing: { before: 40, after: 40 },
        }),
      );
    }
  }

  /* v8 ignore next -- text.split('\n') always yields at least one element, so the empty fallback is unreachable */
  return paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [] })];
}
