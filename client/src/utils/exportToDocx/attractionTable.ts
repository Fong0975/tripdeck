import {
  ExternalHyperlink,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

import type { Attraction } from '@/types';

import {
  ALL_BORDERS,
  CELL_BORDER,
  COL_2L,
  COL_2R,
  COL_3R,
  COL_W,
  CONTENT_WIDTH_DXA,
  FONT,
} from './constants';
import { makeImageParagraphs } from './imageHelpers';
import { parseMarkdownContent } from './markdownToDocx';

// ---------------------------------------------------------------------------
// Attraction table  ─  4 equal columns (25% × 4), all borders
// ---------------------------------------------------------------------------

export async function makeAttractionTable(
  attraction: Attraction,
): Promise<Table> {
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
