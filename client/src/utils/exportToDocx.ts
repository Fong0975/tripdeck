import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

import type {
  AttractionImage,
  Attraction,
  TravelConnection,
  TransportMode,
  Trip,
  TripContent,
} from '@/types';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

// A4 content width: 210mm - 2×25.4mm margins = 159.2mm ≈ 9026 twips
const CONTENT_WIDTH_DXA = 9026;

// Image sizing (pixels at 96 dpi — docx.js converts internally)
const CONTENT_WIDTH_PX = 602;
const HALF_WIDTH_PX = Math.ceil(CONTENT_WIDTH_PX / 2) + 1;

const FONT = 'Microsoft JhengHei';

// Attraction table: 4 equal columns [25% | 25% | 25% | 25%]
const COL_W = Math.round(CONTENT_WIDTH_DXA / 4); // 2257 — single column
const COL_2L = COL_W * 2; // 4514 — left 2 cols (time)
const COL_2R = CONTENT_WIDTH_DXA - COL_2L; // 4512 — right 2 cols (maps)
const COL_3R = CONTENT_WIDTH_DXA - COL_W; // 6769 — right 3 cols (value)

// ---------------------------------------------------------------------------
// Border presets
// ---------------------------------------------------------------------------

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'auto',
  space: 0,
} as const;

const CELL_BORDER = {
  style: BorderStyle.SINGLE,
  size: 6,
  color: '000000',
  space: 0,
} as const;

const TRANSPORT_BORDER = {
  style: BorderStyle.SINGLE,
  size: 18,
  color: '60A5FA',
  space: 0,
} as const;

const ALL_BORDERS = {
  top: CELL_BORDER,
  bottom: CELL_BORDER,
  left: CELL_BORDER,
  right: CELL_BORDER,
} as const;

// ---------------------------------------------------------------------------
// Transport mode labels
// ---------------------------------------------------------------------------

const TRANSPORT_LABELS: Record<TransportMode, string> = {
  walk: '步行',
  transit: '大眾運輸',
  drive: '開車',
  bike: '騎車',
  flight: '飛機',
  other: '其他',
};

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
    Math.max(naturalWidth, HALF_WIDTH_PX),
    CONTENT_WIDTH_PX,
  );
  const targetHeight = Math.round((targetWidth / naturalWidth) * naturalHeight);
  return { width: targetWidth, height: targetHeight };
}

async function makeImageParagraphs(img: AttractionImage): Promise<Paragraph[]> {
  const url = `/uploads/${img.filename}`;
  try {
    const { buffer, imageType } = await fetchImageData(url);
    if (imageType === 'svg') {
      return [];
    }

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
        spacing: { before: 60, after: 40 },
      }),
    ];

    if (img.title) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: img.title,
              italics: true,
              color: '777777',
              size: 18,
              font: FONT,
            }),
          ],
          spacing: { before: 0, after: 60 },
        }),
      );
    }

    return paragraphs;
  } catch {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: `[圖片無法載入${img.title ? `: ${img.title}` : ''}]`,
            color: 'AA0000',
            font: FONT,
          }),
        ],
      }),
    ];
  }
}

// ---------------------------------------------------------------------------
// Inline markdown parser: **bold**, [text](url), plain text
// ---------------------------------------------------------------------------

type InlineChild = TextRun | ExternalHyperlink;

function parseInline(text: string): InlineChild[] {
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

function parseMarkdownContent(text: string): Paragraph[] {
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

  return paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [] })];
}

// ---------------------------------------------------------------------------
// Day header table  ─  1×1, dark blue background, white text
// ---------------------------------------------------------------------------

function makeDayHeaderTable(text: string, isFirstDay: boolean): Table {
  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
            shading: { type: ShadingType.SOLID, fill: '1D4ED8', color: 'auto' },
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            borders: {
              top: NO_BORDER,
              bottom: NO_BORDER,
              left: NO_BORDER,
              right: NO_BORDER,
            },
            children: [
              new Paragraph({
                pageBreakBefore: !isFirstDay,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text,
                    bold: true,
                    color: 'FFFFFF',
                    size: 28,
                    font: FONT,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Attraction table  ─  4 equal columns (25% × 4), all borders
// ---------------------------------------------------------------------------

async function makeAttractionTable(attraction: Attraction): Promise<Table> {
  const rows: TableRow[] = [];

  // ── Row 1: Name (spans all 4 columns) ──────────────────────────────────
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
          borders: ALL_BORDERS,
          margins: { top: 120, bottom: 120, left: 160, right: 160 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: attraction.name,
                  bold: true,
                  size: 26,
                  font: FONT,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  // ── Row 2: Time (cols 1+2) | Maps (cols 3+4) ───────────────────────────
  const hasTime = Boolean(attraction.startTime || attraction.endTime);
  const hasMap = Boolean(attraction.googleMapUrl);

  if (hasTime || hasMap) {
    const timeText = hasTime
      ? `🕐 ${attraction.startTime ?? '–'} – ${attraction.endTime ?? '–'}`
      : '';

    rows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            width: { size: COL_2L, type: WidthType.DXA },
            borders: ALL_BORDERS,
            margins: { top: 80, bottom: 80, left: 160, right: 160 },
            children: [
              new Paragraph({
                children: timeText
                  ? [new TextRun({ text: timeText, font: FONT })]
                  : [],
              }),
            ],
          }),
          new TableCell({
            columnSpan: 2,
            width: { size: COL_2R, type: WidthType.DXA },
            borders: ALL_BORDERS,
            margins: { top: 80, bottom: 80, left: 160, right: 160 },
            children: [
              new Paragraph({
                children: hasMap
                  ? [
                      new TextRun({ text: '📍 ', font: FONT }),
                      new ExternalHyperlink({
                        link: attraction.googleMapUrl!,
                        children: [
                          new TextRun({
                            text: 'Google Maps',
                            style: 'Hyperlink',
                            font: FONT,
                          }),
                        ],
                      }),
                    ]
                  : [],
              }),
            ],
          }),
        ],
      }),
    );
  }

  // ── Row 3: Description + images (spans all 4 columns) ──────────────────
  const hasNotes = Boolean(attraction.notes?.trim());
  const hasImages = (attraction.images ?? []).length > 0;

  if (hasNotes || hasImages) {
    const cellChildren: Paragraph[] = [];

    if (hasNotes) {
      cellChildren.push(...parseMarkdownContent(attraction.notes!));
    }

    for (const img of attraction.images ?? []) {
      cellChildren.push(...(await makeImageParagraphs(img)));
    }

    rows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 4,
            width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
            borders: ALL_BORDERS,
            margins: { top: 100, bottom: 100, left: 160, right: 160 },
            children: cellChildren,
          }),
        ],
      }),
    );
  }

  // ── Row 4: Nearby attractions (col 1 | cols 2–4) ───────────────────────
  if (attraction.nearbyAttractions?.trim()) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: COL_W, type: WidthType.DXA },
            borders: ALL_BORDERS,
            margins: { top: 80, bottom: 80, left: 160, right: 160 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: '附近景點',
                    bold: true,
                    size: 20,
                    font: FONT,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            columnSpan: 3,
            width: { size: COL_3R, type: WidthType.DXA },
            borders: ALL_BORDERS,
            margins: { top: 80, bottom: 80, left: 160, right: 160 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: attraction.nearbyAttractions!,
                    font: FONT,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
  }

  // ── Row 5+: Reference websites (col 1 | cols 2–4) ──────────────────────
  const websites = attraction.referenceWebsites ?? [];
  for (let i = 0; i < websites.length; i++) {
    const site = websites[i];
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: COL_W, type: WidthType.DXA },
            borders: ALL_BORDERS,
            margins: { top: 80, bottom: 80, left: 160, right: 160 },
            children: [
              new Paragraph({
                children:
                  i === 0
                    ? [
                        new TextRun({
                          text: '參考網站',
                          bold: true,
                          size: 20,
                          font: FONT,
                        }),
                      ]
                    : [],
              }),
            ],
          }),
          new TableCell({
            columnSpan: 3,
            width: { size: COL_3R, type: WidthType.DXA },
            borders: ALL_BORDERS,
            margins: { top: 80, bottom: 80, left: 160, right: 160 },
            children: [
              new Paragraph({
                children: [
                  new ExternalHyperlink({
                    link: site.url,
                    children: [
                      new TextRun({
                        text: site.title || site.url,
                        style: 'Hyperlink',
                        font: FONT,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
  }

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [COL_W, COL_W, COL_W, CONTENT_WIDTH_DXA - COL_W * 3],
    borders: {
      top: CELL_BORDER,
      bottom: CELL_BORDER,
      left: CELL_BORDER,
      right: CELL_BORDER,
      insideHorizontal: CELL_BORDER,
      insideVertical: CELL_BORDER,
    },
    rows,
  });
}

// ---------------------------------------------------------------------------
// Transport table  ─  1×1, top + bottom light-blue thick borders only
// ---------------------------------------------------------------------------

async function makeTransportTable(
  conn: TravelConnection,
  toName: string,
): Promise<Table> {
  const cellChildren: Paragraph[] = [];

  const parts = [TRANSPORT_LABELS[conn.transportMode]];
  if (conn.duration) {
    parts.push(conn.duration);
  }
  const header = `交通方式：${parts.join(' · ')}${toName ? ` → ${toName}` : ''}`;

  cellChildren.push(
    new Paragraph({
      children: [new TextRun({ text: header, bold: true, font: FONT })],
      spacing: { before: 40, after: 40 },
    }),
  );

  if (conn.route) {
    cellChildren.push(
      new Paragraph({
        children: [new TextRun({ text: `路線：${conn.route}`, font: FONT })],
        spacing: { before: 40, after: 40 },
      }),
    );
  }

  if (conn.notes) {
    for (const line of conn.notes.split('\n')) {
      cellChildren.push(
        new Paragraph({
          children: line.trim()
            ? [new TextRun({ text: line, font: FONT })]
            : [],
          spacing: { before: 20, after: 20 },
        }),
      );
    }
  }

  for (const img of conn.images ?? []) {
    cellChildren.push(...(await makeImageParagraphs(img)));
  }

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    borders: {
      top: TRANSPORT_BORDER,
      bottom: TRANSPORT_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
            borders: {
              top: TRANSPORT_BORDER,
              bottom: TRANSPORT_BORDER,
              left: NO_BORDER,
              right: NO_BORDER,
            },
            margins: { top: 120, bottom: 120, left: 0, right: 0 },
            children: cellChildren,
          }),
        ],
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function exportToDocx(
  trip: Trip,
  content: TripContent,
): Promise<void> {
  type DocChild = Paragraph | Table;
  const children: DocChild[] = [];

  // === Header section =====================================================

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: trip.title, font: FONT })],
      spacing: { after: 160 },
    }),
  );

  children.push(
    new Paragraph({ children: [], spacing: { before: 0, after: 80 } }),
  );

  if (trip.destination) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '地點：', bold: true, font: FONT }),
          new TextRun({ text: trip.destination, font: FONT }),
        ],
        spacing: { before: 40, after: 40 },
      }),
    );
  }

  const startDate = format(parseISO(trip.startDate), 'yyyy/MM/dd', {
    locale: zhTW,
  });
  const endDate = format(parseISO(trip.endDate), 'yyyy/MM/dd', {
    locale: zhTW,
  });
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '日期：', bold: true, font: FONT }),
        new TextRun({
          text: `${startDate} - ${endDate} ( ${content.days.length} 天 )`,
          font: FONT,
        }),
      ],
      spacing: { before: 40, after: 40 },
    }),
  );

  children.push(
    new Paragraph({ children: [], spacing: { before: 0, after: 80 } }),
  );

  if (trip.description?.trim()) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: trip.description, font: FONT })],
        spacing: { before: 40, after: 40 },
      }),
    );
    children.push(
      new Paragraph({ children: [], spacing: { before: 0, after: 80 } }),
    );
  }

  children.push(
    new Paragraph({
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: 'CCCCCC',
          space: 1,
        },
      },
      spacing: { before: 60, after: 240 },
      children: [],
    }),
  );

  // === Day sections ========================================================

  for (let dayIdx = 0; dayIdx < content.days.length; dayIdx++) {
    const day = content.days[dayIdx];
    const isFirstDay = dayIdx === 0;

    const dayLabel = format(parseISO(day.date), 'M月d日 (EEEE)', {
      locale: zhTW,
    });
    children.push(
      makeDayHeaderTable(`第 ${day.day} 天 · ${dayLabel}`, isFirstDay),
    );
    children.push(
      new Paragraph({ children: [], spacing: { before: 0, after: 200 } }),
    );

    const connsByFrom = new Map<number, TravelConnection[]>();
    for (const c of day.connections) {
      const list = connsByFrom.get(c.fromAttractionId) ?? [];
      list.push(c);
      connsByFrom.set(c.fromAttractionId, list);
    }

    for (const attraction of day.attractions) {
      children.push(await makeAttractionTable(attraction));

      const outgoing = connsByFrom.get(attraction.id) ?? [];
      for (const conn of outgoing) {
        const toName =
          day.attractions.find(a => a.id === conn.toAttractionId)?.name ?? '';
        children.push(
          new Paragraph({ children: [], spacing: { before: 0, after: 120 } }),
        );
        children.push(await makeTransportTable(conn, toName));
      }

      children.push(
        new Paragraph({ children: [], spacing: { before: 0, after: 200 } }),
      );
    }
  }

  // === Build & download ====================================================

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
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
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
  link.download = `${trip.title}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
