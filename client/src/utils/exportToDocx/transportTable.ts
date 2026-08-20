import {
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

import { TRANSPORT_MODE_META } from '@/constants/transportModes';
import type { TravelConnection } from '@/types';
import { formatDurationDisplay } from '@/utils/duration';

import {
  CONTENT_WIDTH_DXA,
  FONT,
  NO_BORDER,
  TRANSPORT_BORDER,
} from './constants';
import { makeImageParagraphs } from './imageHelpers';

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
// Transport table  ─  1×1, top + bottom light-blue thick borders only
// ---------------------------------------------------------------------------

export async function makeTransportTable(
  conn: TravelConnection,
  toName: string,
): Promise<Table> {
  const cellChildren: Paragraph[] = [];

  const parts = [TRANSPORT_MODE_META[conn.transportMode].label];
  const durationDisplay = formatDurationDisplay(conn.duration);
  if (durationDisplay) {
    parts.push(durationDisplay);
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
