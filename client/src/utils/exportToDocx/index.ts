import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Document, Packer, Paragraph, Table, TextRun } from 'docx';

import type { Trip, TripContent, TravelConnection } from '@/types';
import { daysFromToday } from '@/utils/date';
import { downloadBlob } from '@/utils/download';
import { fetchDailyWeather, isWeatherEnabled } from '@/utils/weatherApi';

import { makeAttractionTable } from './attractionTable';
import { FONT } from './constants';
import { makeDayNotesSection } from './dayNotesSection';
import { makeHeaderSection } from './headerSection';
import { makeDayHeaderTable, makeTransportTable } from './transportTable';

export async function exportToDocx(
  trip: Trip,
  content: TripContent,
): Promise<void> {
  type DocChild = Paragraph | Table;
  const children: DocChild[] = [];

  children.push(...(await makeHeaderSection(trip, content.days.length)));

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

    children.push(...(await makeDayNotesSection(day)));

    if (
      isWeatherEnabled &&
      day.locations.length > 0 &&
      daysFromToday(day.date) >= 0
    ) {
      for (const loc of day.locations) {
        const weather = await fetchDailyWeather(loc.name, day.date);
        if (weather.status === 'success') {
          const d = weather.data;
          let text = `${loc.name}：${d.description} | ${d.tempMin}° / ${d.tempMax}°C | 💧 ${d.humidity}%`;
          if (d.pop > 0) {
            text += ` | ☂ ${d.pop}%`;
          }
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text, color: '445566', size: 20, font: FONT }),
              ],
              spacing: { before: 100, after: 0 },
            }),
          );
        }
      }
    }

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
  downloadBlob(blob, `${trip.title}.docx`);
}
