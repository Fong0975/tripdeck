import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { BorderStyle, HeadingLevel, Paragraph, TextRun } from 'docx';

import type { Trip } from '@/types';

import { FONT } from './constants';
import { makeImageParagraphs } from './imageHelpers';

// ---------------------------------------------------------------------------
// Header section  ─  title, destination, date range, description, images,
// then a divider before the day-by-day itinerary sections begin.
// ---------------------------------------------------------------------------

export async function makeHeaderSection(
  trip: Trip,
  totalDays: number,
): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: trip.title, font: FONT })],
      spacing: { after: 160 },
    }),
  );

  paragraphs.push(
    new Paragraph({ children: [], spacing: { before: 0, after: 80 } }),
  );

  if (trip.destination) {
    paragraphs.push(
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
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: '日期：', bold: true, font: FONT }),
        new TextRun({
          text: `${startDate} - ${endDate} ( ${totalDays} 天 )`,
          font: FONT,
        }),
      ],
      spacing: { before: 40, after: 40 },
    }),
  );

  paragraphs.push(
    new Paragraph({ children: [], spacing: { before: 0, after: 80 } }),
  );

  if (trip.description?.trim()) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: trip.description, font: FONT })],
        spacing: { before: 40, after: 40 },
      }),
    );
    paragraphs.push(
      new Paragraph({ children: [], spacing: { before: 0, after: 80 } }),
    );
  }

  if (trip.images?.length) {
    for (const img of trip.images) {
      paragraphs.push(...(await makeImageParagraphs(img)));
    }
    paragraphs.push(
      new Paragraph({ children: [], spacing: { before: 0, after: 80 } }),
    );
  }

  paragraphs.push(
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

  return paragraphs;
}
