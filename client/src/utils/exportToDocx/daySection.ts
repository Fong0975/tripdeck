import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale/zh-TW';
import { Paragraph, TextRun, type Table } from 'docx';

import type { DayPlan } from '@/types';
import { isConnectionAdjacent } from '@/utils/connectionAdjacency';
import { daysFromToday } from '@/utils/date';
import { fetchDailyWeather, type WeatherResult } from '@/utils/weatherApi';

import { makeAttractionTable } from './attractionTable';
import { FONT } from './constants';
import { makeDayMapSection } from './dayMapSection';
import { makeDayNotesSection } from './dayNotesSection';
import type { DayMapExportOptions } from './exportOptions';
import { makeDayHeaderTable, makeTransportTable } from './transportTable';

/** A top-level block in the exported document body. */
export type DocChild = Paragraph | Table;

/**
 * A deferred unit of document content. Tasks are run with bounded
 * concurrency and their outputs concatenated in task order.
 */
export type DocTask = () => Promise<DocChild[]>;

function spacer(after: number): Paragraph {
  return new Paragraph({ children: [], spacing: { before: 0, after } });
}

/**
 * Renders one location's forecast line, or `null` when the lookup did not
 * succeed (such locations are silently left out of the export).
 */
function makeWeatherParagraph(
  locationName: string,
  weather: WeatherResult,
): Paragraph | null {
  if (weather.status !== 'success') {
    return null;
  }
  const d = weather.data;
  let text = `${locationName}：${d.description} | ${d.tempMin}° / ${d.tempMax}°C | 💧 ${d.humidity}%`;
  if (d.pop > 0) {
    text += ` | ☂ ${d.pop}%`;
  }
  return new Paragraph({
    children: [new TextRun({ text, color: '445566', size: 20, font: FONT })],
    spacing: { before: 100, after: 0 },
  });
}

function makeWeatherTasks(day: DayPlan, isWeatherEnabled: boolean): DocTask[] {
  if (
    !isWeatherEnabled ||
    day.locations.length === 0 ||
    daysFromToday(day.date) < 0
  ) {
    return [];
  }
  return day.locations.map(loc => async () => {
    const paragraph = makeWeatherParagraph(
      loc.name,
      await fetchDailyWeather(loc.name, day.date),
    );
    return paragraph ? [paragraph] : [];
  });
}

/**
 * One task per attraction table, followed by a task for the connection to
 * the next attraction when there is one. Only adjacent connections are
 * exported, matching what the board (DayColumn) shows.
 */
function makeAttractionTasks(day: DayPlan): DocTask[] {
  const orderedIds = day.attractions.map(a => a.id);
  return day.attractions.flatMap((attraction, i): DocTask[] => {
    const tasks: DocTask[] = [
      async () => [await makeAttractionTable(attraction)],
    ];

    const conn = day.connections.find(
      c =>
        c.fromAttractionId === attraction.id &&
        isConnectionAdjacent(c, orderedIds),
    );
    if (conn) {
      const toName = day.attractions[i + 1]?.name ?? '';
      tasks.push(async () => [
        spacer(120),
        await makeTransportTable(conn, toName),
      ]);
    }

    tasks.push(() => Promise.resolve([spacer(200)]));
    return tasks;
  });
}

/**
 * Builds the ordered content tasks for one day: its header, the day map
 * picture, notes, weather lines, then each attraction with its outgoing
 * connection.
 *
 * @param day - The day to export.
 * @param isFirstDay - Whether this is the trip's first day (affects the
 *   header's page-break behaviour).
 * @param isWeatherEnabled - Whether the backend has a weather provider.
 * @param dayMapOptions - The user's day map picture settings.
 * @returns Tasks whose outputs, concatenated in order, form the day section.
 */
export function makeDaySectionTasks(
  day: DayPlan,
  isFirstDay: boolean,
  isWeatherEnabled: boolean,
  dayMapOptions: DayMapExportOptions,
): DocTask[] {
  const dayLabel = format(parseISO(day.date), 'M月d日 (EEEE)', {
    locale: zhTW,
  });
  const header = makeDayHeaderTable(
    `第 ${day.day} 天 · ${dayLabel}`,
    isFirstDay,
  );

  return [
    () => Promise.resolve([header]),
    () => makeDayMapSection(day, dayMapOptions),
    () => makeDayNotesSection(day),
    ...makeWeatherTasks(day, isWeatherEnabled),
    () => Promise.resolve([spacer(200)]),
    ...makeAttractionTasks(day),
  ];
}
