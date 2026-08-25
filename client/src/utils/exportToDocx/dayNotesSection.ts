import { Paragraph, TextRun } from 'docx';

import type { DayPlan } from '@/types';

import { FONT } from './constants';
import { makeImageParagraphs } from './imageHelpers';

// ---------------------------------------------------------------------------
// Day notes + images  ─  appended right after a day's header, before its
// first attraction. Notes are rendered as plain body text (no heading).
// ---------------------------------------------------------------------------

export async function makeDayNotesSection(day: DayPlan): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = [];

  if (day.notes?.trim()) {
    for (const line of day.notes.split('\n')) {
      paragraphs.push(
        new Paragraph({
          children: line.trim()
            ? [new TextRun({ text: line, font: FONT })]
            : [],
          spacing: { before: 40, after: 40 },
        }),
      );
    }
  }

  if (day.images?.length) {
    for (const img of day.images) {
      paragraphs.push(...(await makeImageParagraphs(img)));
    }
    paragraphs.push(
      new Paragraph({ children: [], spacing: { before: 0, after: 200 } }),
    );
  }

  return paragraphs;
}
