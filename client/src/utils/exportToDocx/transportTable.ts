import {
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  WidthType,
} from 'docx';

import { getTransportModeMeta } from '@/constants/transportModes';
import type { TravelConnection } from '@/types';
import { formatDurationDisplay } from '@/utils/duration';

import { CONTENT_WIDTH_DXA, NO_BORDER, TRANSPORT_BORDER } from './constants';
import { textRun } from './docxPrimitives';
import { makeImageParagraphs } from './imageHelpers';
import { parseMarkdownContent } from './markdownToDocx';

// ---------------------------------------------------------------------------
// Day header table  ─  1×1, dark blue background, white text
// ---------------------------------------------------------------------------

export function makeDayHeaderTable(text: string, isFirstDay: boolean): Table {
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
                  textRun(text, { bold: true, color: 'FFFFFF', size: 28 }),
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
// Transport table  ─  1×1, top + bottom light-blue thick borders only
// ---------------------------------------------------------------------------

export async function makeTransportTable(
  conn: TravelConnection,
  toName: string,
): Promise<Table> {
  const cellChildren: (Paragraph | Table)[] = [];

  const parts = [getTransportModeMeta(conn.transportMode).label];
  const durationDisplay = formatDurationDisplay(conn.duration);
  if (durationDisplay) {
    parts.push(durationDisplay);
  }
  const header = `交通方式：${parts.join(' · ')}${toName ? ` → ${toName}` : ''}`;

  cellChildren.push(
    new Paragraph({
      children: [textRun(header, { bold: true })],
      spacing: { before: 40, after: 40 },
    }),
  );

  if (conn.route) {
    // The label gets its own line: markdown content can open with a heading or
    // a list, which cannot share a paragraph with an inline prefix.
    cellChildren.push(
      new Paragraph({
        children: [textRun('路線', { bold: true, size: 20 })],
        spacing: { before: 40, after: 20 },
      }),
    );
    cellChildren.push(...parseMarkdownContent(conn.route));
  }

  if (conn.notes) {
    for (const line of conn.notes.split('\n')) {
      cellChildren.push(
        new Paragraph({
          children: line.trim() ? [textRun(line)] : [],
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
