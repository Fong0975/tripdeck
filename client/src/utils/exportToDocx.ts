import {
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  LineRuleType,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

// A4 content width in pixels (8.27in - 2×1in margin = 6.27in × 96dpi ≈ 602px)
const CONTENT_WIDTH_PX = 602;
const MIN_IMAGE_WIDTH_PX = Math.ceil(CONTENT_WIDTH_PX / 2) + 1;

type ParagraphChild = TextRun | ExternalHyperlink | ImageRun;

// ---------------------------------------------------------------------------
// Inline markdown parser: handles **bold**, [text](url), plain text
// ---------------------------------------------------------------------------

function parseInline(text: string): ParagraphChild[] {
  const result: ParagraphChild[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      result.push(new TextRun({ text: boldMatch[1], bold: true }));
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      result.push(
        new ExternalHyperlink({
          link: linkMatch[2],
          children: [new TextRun({ text: linkMatch[1], style: 'Hyperlink' })],
        }),
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    const nextSpecial = remaining.search(/\*\*|\[/);
    if (nextSpecial === -1) {
      result.push(new TextRun({ text: remaining }));
      remaining = '';
    } else if (nextSpecial === 0) {
      result.push(new TextRun({ text: remaining[0] }));
      remaining = remaining.slice(1);
    } else {
      result.push(new TextRun({ text: remaining.slice(0, nextSpecial) }));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

type SupportedImageType = 'jpg' | 'png' | 'gif' | 'bmp' | 'svg';

async function fetchImageData(
  url: string,
): Promise<{ buffer: ArrayBuffer; imageType: SupportedImageType }> {
  const absoluteUrl = url.startsWith('/')
    ? `${window.location.origin}${url}`
    : url;

  const response = await fetch(absoluteUrl);
  if (!response.ok) {
    throw new Error(`Image fetch failed: ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') ?? '';
  const lower = url.toLowerCase();

  let imageType: SupportedImageType = 'jpg';
  if (contentType.includes('png') || lower.endsWith('.png')) {
    imageType = 'png';
  } else if (contentType.includes('gif') || lower.endsWith('.gif')) {
    imageType = 'gif';
  } else if (contentType.includes('bmp') || lower.endsWith('.bmp')) {
    imageType = 'bmp';
  } else if (contentType.includes('svg') || lower.endsWith('.svg')) {
    imageType = 'svg';
  }

  return { buffer, imageType };
}

async function getImageSize(
  buffer: ArrayBuffer,
  imageType: SupportedImageType,
): Promise<{ width: number; height: number }> {
  if (imageType === 'svg') {
    const text = new TextDecoder().decode(buffer);
    const w = text.match(/width="(\d+)/)?.[1];
    const h = text.match(/height="(\d+)/)?.[1];
    return w && h
      ? { width: parseInt(w), height: parseInt(h) }
      : { width: 400, height: 300 };
  }

  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: `image/${imageType}` });
    const objUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objUrl);
    };
    img.onerror = err => {
      URL.revokeObjectURL(objUrl);
      reject(err);
    };
    img.src = objUrl;
  });
}

function calcImageDimensions(
  naturalWidth: number,
  naturalHeight: number,
): { width: number; height: number } {
  const targetWidth = Math.min(
    Math.max(naturalWidth, MIN_IMAGE_WIDTH_PX),
    CONTENT_WIDTH_PX,
  );
  const targetHeight = Math.round((targetWidth / naturalWidth) * naturalHeight);
  return { width: targetWidth, height: targetHeight };
}

async function makeImageParagraphs(
  title: string,
  url: string,
): Promise<Paragraph[]> {
  try {
    const { buffer, imageType } = await fetchImageData(url);
    const { width: nw, height: nh } = await getImageSize(buffer, imageType);
    const { width, height } = calcImageDimensions(nw, nh);

    const paragraphs: Paragraph[] = [
      new Paragraph({
        children: [
          new ImageRun({
            data: buffer,
            transformation: { width, height },
            type: imageType,
          }),
        ],
      }),
    ];

    if (title) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              italics: true,
              color: '777777',
              size: 18,
              font: 'Microsoft JhengHei',
            }),
          ],
        }),
      );
    }

    return paragraphs;
  } catch {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: `[圖片無法載入${title ? `: ${title}` : ''}]`,
            color: 'AA0000',
          }),
        ],
      }),
    ];
  }
}

// ---------------------------------------------------------------------------
// Markdown → docx Paragraph array
// ---------------------------------------------------------------------------

// Twips reference: 1 inch = 1440 twips, 1 line ≈ 240 twips at 12pt
const SPACING_HALF_LINE = 120;

function makeDayHeadingParagraph(text: string, isFirstDay: boolean): Paragraph {
  return new Paragraph({
    pageBreakBefore: !isFirstDay,
    shading: {
      type: ShadingType.SOLID,
      fill: '1D4ED8',
      color: 'auto',
    },
    spacing: {
      before: 0,
      after: 280,
      line: 440,
      lineRule: LineRuleType.AT_LEAST,
    },
    indent: { left: 160, right: 160 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: 'FFFFFF',
        size: 28,
        font: 'Microsoft JhengHei',
      }),
    ],
  });
}

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'auto',
  space: 0,
} as const;

const ACCENT_BORDER = {
  style: BorderStyle.SINGLE,
  size: 24,
  color: '3B82F6',
  space: 0,
} as const;

async function makeTransportTable(contentLines: string[]): Promise<Table> {
  const cellChildren: Paragraph[] = [];

  for (const line of contentLines) {
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      const [, title, url] = imageMatch;
      cellChildren.push(...(await makeImageParagraphs(title, url)));
      continue;
    }

    if (line.trim() === '') {
      cellChildren.push(
        new Paragraph({ children: [], spacing: { before: 40, after: 40 } }),
      );
      continue;
    }

    cellChildren.push(
      new Paragraph({
        children: parseInline(line),
        spacing: {
          before: 40,
          after: 40,
          line: 320,
          lineRule: LineRuleType.AT_LEAST,
        },
      }),
    );
  }

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideH: NO_BORDER,
      insideV: NO_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: ACCENT_BORDER,
              bottom: ACCENT_BORDER,
              left: NO_BORDER,
              right: NO_BORDER,
            },
            margins: { top: 120, bottom: 120, left: 160, right: 0 },
            children: cellChildren,
          }),
        ],
      }),
    ],
  });
}

type DocChild = Paragraph | Table;

async function parseMarkdownToDocx(markdown: string): Promise<DocChild[]> {
  const lines = markdown.split('\n');
  const result: DocChild[] = [];
  let dayHeadingCount = 0;
  let quoteBuffer: string[] = [];

  async function flushQuote() {
    if (quoteBuffer.length > 0) {
      result.push(await makeTransportTable(quoteBuffer));
      quoteBuffer = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith('> ')) {
      quoteBuffer.push(line.slice(2));
      continue;
    }

    await flushQuote();

    if (line.startsWith('# ')) {
      result.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: parseInline(line.slice(2)),
          spacing: { after: 200 },
          indent: { left: 0, firstLine: 0 },
        }),
      );
      continue;
    }

    if (line.startsWith('## ')) {
      dayHeadingCount++;
      result.push(
        makeDayHeadingParagraph(line.slice(3), dayHeadingCount === 1),
      );
      continue;
    }

    if (line.startsWith('### ')) {
      result.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: parseInline(line.slice(4)),
          spacing: { before: 240, after: SPACING_HALF_LINE },
          indent: { left: 0, firstLine: 0 },
        }),
      );
      continue;
    }

    if (line === '---') {
      result.push(
        new Paragraph({
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: 'CCCCCC',
              space: 1,
            },
          },
          spacing: { before: 240, after: 240 },
          children: [],
        }),
      );
      continue;
    }

    if (line.startsWith('- ')) {
      result.push(
        new Paragraph({
          children: parseInline(line.slice(2)),
          bullet: { level: 0 },
          spacing: { before: 60, after: 60 },
        }),
      );
      continue;
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      const [, title, url] = imageMatch;
      result.push(...(await makeImageParagraphs(title, url)));
      continue;
    }

    if (line.trim() === '') {
      result.push(new Paragraph({ children: [] }));
      continue;
    }

    result.push(
      new Paragraph({
        children: parseInline(line),
        spacing: { before: 60, after: 60 },
        indent: { left: 0, firstLine: 0 },
      }),
    );
  }

  await flushQuote();

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function exportToDocx(
  markdown: string,
  filename: string,
): Promise<void> {
  const children = await parseMarkdownToDocx(markdown);

  const FONT = 'Microsoft JhengHei';

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 24 },
        },
        heading1: {
          run: { font: FONT, bold: true, size: 40, color: '111827' },
          paragraph: { indent: { left: 0, firstLine: 0 } },
        },
        heading2: {
          run: { font: FONT, bold: true, size: 34, color: '1F2937' },
          paragraph: { indent: { left: 0, firstLine: 0 } },
        },
        heading3: {
          run: { font: FONT, bold: true, size: 26, color: '374151' },
          paragraph: { indent: { left: 0, firstLine: 0 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
