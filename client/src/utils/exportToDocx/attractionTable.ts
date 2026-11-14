import {
  ExternalHyperlink,
  Paragraph,
  Table,
  TableRow,
  type TextRun,
  WidthType,
} from 'docx';

import type { Attraction } from '@/types';

import {
  CELL_BORDER,
  COL_2L,
  COL_2R,
  COL_3R,
  COL_W,
  CONTENT_WIDTH_DXA,
} from './constants';
import { borderedCell, textRun, uniformTableBorders } from './docxPrimitives';
import { makeImageParagraphs } from './imageHelpers';
import { parseMarkdownContent } from './markdownToDocx';

// ---------------------------------------------------------------------------
// Attraction table  ─  4 equal columns (25% × 4), all borders
// ---------------------------------------------------------------------------

/** Bold row label shown in the narrow left column (e.g. 「附近景點」). */
function rowLabel(label: string): TextRun {
  return textRun(label, { bold: true, size: 20 });
}

/** Hyperlink rendered with Word's built-in "Hyperlink" character style. */
function link(url: string, label: string): ExternalHyperlink {
  return new ExternalHyperlink({
    link: url,
    children: [textRun(label, { style: 'Hyperlink' })],
  });
}

/**
 * A "label | value" row: the label fills column 1, the value spans columns
 * 2–4.
 */
function labelledRow(
  labelRuns: TextRun[],
  valueChildren: (Paragraph | Table)[],
): TableRow {
  return new TableRow({
    children: [
      borderedCell({
        width: COL_W,
        paddingY: 80,
        children: [new Paragraph({ children: labelRuns })],
      }),
      borderedCell({
        columnSpan: 3,
        width: COL_3R,
        paddingY: 80,
        children: valueChildren,
      }),
    ],
  });
}

/**
 * Renders one attraction as a bordered 4-column table: name, time + map link,
 * notes + images, nearby attractions, then one row per reference website.
 * Optional rows are omitted when their content is empty.
 *
 * @param attraction - The attraction to render.
 * @returns The docx table.
 */
export async function makeAttractionTable(
  attraction: Attraction,
): Promise<Table> {
  const rows: TableRow[] = [];

  // ── Row 1: Name (spans all 4 columns) ──────────────────────────────────
  rows.push(
    new TableRow({
      children: [
        borderedCell({
          columnSpan: 4,
          width: CONTENT_WIDTH_DXA,
          paddingY: 120,
          children: [
            new Paragraph({
              children: [textRun(attraction.name, { bold: true, size: 26 })],
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
          borderedCell({
            columnSpan: 2,
            width: COL_2L,
            paddingY: 80,
            children: [
              new Paragraph({ children: timeText ? [textRun(timeText)] : [] }),
            ],
          }),
          borderedCell({
            columnSpan: 2,
            width: COL_2R,
            paddingY: 80,
            children: [
              new Paragraph({
                children: hasMap
                  ? [
                      textRun('📍 '),
                      link(attraction.googleMapUrl!, 'Google Maps'),
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
    const cellChildren: (Paragraph | Table)[] = [];

    if (hasNotes) {
      cellChildren.push(...parseMarkdownContent(attraction.notes!));
    }

    for (const img of attraction.images ?? []) {
      cellChildren.push(...(await makeImageParagraphs(img)));
    }

    rows.push(
      new TableRow({
        children: [
          borderedCell({
            columnSpan: 4,
            width: CONTENT_WIDTH_DXA,
            paddingY: 100,
            children: cellChildren,
          }),
        ],
      }),
    );
  }

  // ── Row 4: Nearby attractions (col 1 | cols 2–4) ───────────────────────
  if (attraction.nearbyAttractions?.trim()) {
    rows.push(
      labelledRow(
        [rowLabel('附近景點')],
        parseMarkdownContent(attraction.nearbyAttractions),
      ),
    );
  }

  // ── Row 5+: Reference websites (col 1 | cols 2–4) ──────────────────────
  (attraction.referenceWebsites ?? []).forEach((site, i) => {
    rows.push(
      labelledRow(i === 0 ? [rowLabel('參考網站')] : [], [
        new Paragraph({ children: [link(site.url, site.title || site.url)] }),
      ]),
    );
  });

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [COL_W, COL_W, COL_W, CONTENT_WIDTH_DXA - COL_W * 3],
    borders: uniformTableBorders(CELL_BORDER),
    rows,
  });
}
