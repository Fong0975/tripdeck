import { Document, Packer, type Paragraph, type Table } from 'docx';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { textRuns } from '@/test-utils/docx';
import {
  makeAttraction,
  makeConnection,
  makeContent,
  makeDay,
  makeTrip,
  makeWeatherSuccess,
} from '@/test-utils/fixtures';
import type { DayLocation } from '@/types';
import { daysFromToday } from '@/utils/date';
import { downloadBlob } from '@/utils/download';
import { fetchDailyWeather, getWeatherEnabled } from '@/utils/weatherApi';

import { makeAttractionTable } from './attractionTable';
import { makeDayNotesSection } from './dayNotesSection';
import { makeHeaderSection } from './headerSection';
import { makeDayHeaderTable, makeTransportTable } from './transportTable';

import { exportToDocx } from './index';

vi.mock('docx');

vi.mock('@/utils/date', () => ({ daysFromToday: vi.fn() }));
vi.mock('@/utils/download', () => ({ downloadBlob: vi.fn() }));
vi.mock('@/utils/weatherApi', () => ({
  fetchDailyWeather: vi.fn(),
  getWeatherEnabled: vi.fn(),
}));
vi.mock('./attractionTable', () => ({ makeAttractionTable: vi.fn() }));
// The header section's own content (title/destination/date/description/
// images) is unit-tested in headerSection.test.ts; here it's stubbed to a
// single sentinel paragraph so this file can focus on orchestration —
// building the day sections and packing/downloading the final document.
vi.mock('./headerSection', () => ({ makeHeaderSection: vi.fn() }));
// Likewise, a day's own notes/images content is unit-tested in
// dayNotesSection.test.ts; here it's stubbed to a single sentinel paragraph.
vi.mock('./dayNotesSection', () => ({ makeDayNotesSection: vi.fn() }));
vi.mock('./transportTable', () => ({
  makeDayHeaderTable: vi.fn(),
  makeTransportTable: vi.fn(),
}));

const headerSentinel = { type: 'Paragraph', options: { sentinel: 'header' } };
const dayNotesSentinel = {
  type: 'Paragraph',
  options: { sentinel: 'day-notes' },
};

beforeEach(() => {
  vi.mocked(Packer.toBlob).mockResolvedValue(new Blob(['docx']));
  vi.mocked(makeHeaderSection).mockResolvedValue([
    headerSentinel as unknown as Paragraph,
  ]);
  vi.mocked(makeDayNotesSection).mockResolvedValue([
    dayNotesSentinel as unknown as Paragraph,
  ]);
  vi.mocked(makeAttractionTable).mockResolvedValue({
    type: 'Table',
    options: {},
  } as unknown as Table);
  vi.mocked(makeDayHeaderTable).mockReturnValue({
    type: 'Table',
    options: {},
  } as unknown as Table);
  vi.mocked(makeTransportTable).mockResolvedValue({
    type: 'Table',
    options: {},
  } as unknown as Table);
  vi.mocked(daysFromToday).mockReturnValue(-1);
  vi.mocked(fetchDailyWeather).mockResolvedValue({ status: 'error' });
  vi.mocked(getWeatherEnabled).mockResolvedValue(true);
});

describe('exportToDocx', () => {
  it('builds the document, packs it, and downloads it under the trip title', async () => {
    await exportToDocx(makeTrip({ title: '東京行' }), makeContent([]));

    expect(Packer.toBlob).toHaveBeenCalledTimes(1);
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(downloadBlob).toHaveBeenCalledWith(expect.anything(), '東京行.docx');
  });

  it('builds the header section with the trip and its total day count', async () => {
    const days = [
      makeDay({ id: 1, day: 1, date: '2026-08-20' }),
      makeDay({ id: 2, day: 2, date: '2026-08-21' }),
    ];
    const aTrip = makeTrip();

    await exportToDocx(aTrip, makeContent(days));

    expect(makeHeaderSection).toHaveBeenCalledWith(aTrip, 2);
  });

  it('places the header section paragraphs before the day sections', async () => {
    await exportToDocx(makeTrip(), makeContent([]));

    const documentOptions = vi.mocked(Document).mock.calls[0][0] as {
      sections: [{ children: unknown[] }];
    };
    expect(documentOptions.sections[0].children[0]).toBe(headerSentinel);
  });

  it('calls makeDayHeaderTable once per day with isFirstDay true only for the first day', async () => {
    const days = [
      makeDay({ id: 1, day: 1, date: '2026-08-20' }),
      makeDay({ id: 2, day: 2, date: '2026-08-21' }),
    ];

    await exportToDocx(makeTrip(), makeContent(days));

    expect(makeDayHeaderTable).toHaveBeenCalledTimes(2);
    expect(vi.mocked(makeDayHeaderTable).mock.calls[0][1]).toBe(true);
    expect(vi.mocked(makeDayHeaderTable).mock.calls[1][1]).toBe(false);
  });

  it('calls makeAttractionTable once per attraction, in order', async () => {
    const a1 = makeAttraction({ id: 1, name: '晴空塔' });
    const a2 = makeAttraction({ id: 2, name: '淺草寺' });
    const day = makeDay({ attractions: [a1, a2] });

    await exportToDocx(makeTrip(), makeContent([day]));

    expect(makeAttractionTable).toHaveBeenCalledTimes(2);
    expect(vi.mocked(makeAttractionTable).mock.calls).toEqual([[a1], [a2]]);
  });

  it.each([
    {
      description: 'the destination attraction exists',
      toAttractionId: 2,
      expectedToName: '淺草寺',
    },
    {
      description: 'the destination attraction is not found',
      toAttractionId: 999,
      expectedToName: '',
    },
  ])(
    'resolves toName when $description',
    async ({ toAttractionId, expectedToName }) => {
      const a1 = makeAttraction({ id: 1, name: '晴空塔' });
      const a2 = makeAttraction({ id: 2, name: '淺草寺' });
      const conn = makeConnection({ fromAttractionId: 1, toAttractionId });
      const day = makeDay({ attractions: [a1, a2], connections: [conn] });

      await exportToDocx(makeTrip(), makeContent([day]));

      expect(makeTransportTable).toHaveBeenCalledWith(conn, expectedToName);
    },
  );

  it.each([
    {
      description: 'weather is disabled',
      enabled: false,
      locations: [{ id: 1, name: '東京' }] as DayLocation[],
      daysFromTodayValue: 0,
    },
    {
      description: 'the day has no locations',
      enabled: true,
      locations: [] as DayLocation[],
      daysFromTodayValue: 0,
    },
    {
      description: 'the day is in the past',
      enabled: true,
      locations: [{ id: 1, name: '東京' }] as DayLocation[],
      daysFromTodayValue: -1,
    },
  ])(
    'does not fetch weather when $description',
    async ({ enabled, locations, daysFromTodayValue }) => {
      vi.mocked(getWeatherEnabled).mockResolvedValue(enabled);
      vi.mocked(daysFromToday).mockReturnValue(daysFromTodayValue);
      const day = makeDay({ locations });

      await exportToDocx(makeTrip(), makeContent([day]));

      expect(fetchDailyWeather).not.toHaveBeenCalled();
    },
  );

  it('adds a weather paragraph when fetchDailyWeather resolves a success status', async () => {
    vi.mocked(daysFromToday).mockReturnValue(0);
    vi.mocked(fetchDailyWeather).mockResolvedValue(
      makeWeatherSuccess({
        resolvedName: '東京',
        description: '晴天',
        pop: 0,
      }),
    );
    const day = makeDay({ locations: [{ id: 1, name: '東京' }] });

    await exportToDocx(makeTrip(), makeContent([day]));

    expect(fetchDailyWeather).toHaveBeenCalledWith('東京', day.date);
    expect(
      textRuns().some(text => text.includes('東京') && text.includes('晴天')),
    ).toBe(true);
  });

  it('appends the rain probability text when pop is greater than 0', async () => {
    vi.mocked(daysFromToday).mockReturnValue(0);
    vi.mocked(fetchDailyWeather).mockResolvedValue(
      makeWeatherSuccess({
        resolvedName: '東京',
        icon: 'rain',
        description: '雨天',
        tempMin: 18,
        tempMax: 22,
        humidity: 80,
        pop: 60,
      }),
    );
    const day = makeDay({ locations: [{ id: 1, name: '東京' }] });

    await exportToDocx(makeTrip(), makeContent([day]));

    expect(textRuns().some(text => text.includes('☂ 60%'))).toBe(true);
  });

  it('adds no weather paragraph when fetchDailyWeather resolves a non-success status', async () => {
    vi.mocked(daysFromToday).mockReturnValue(0);
    vi.mocked(fetchDailyWeather).mockResolvedValue({ status: 'error' });
    const day = makeDay({ locations: [{ id: 1, name: '東京' }] });

    await exportToDocx(makeTrip(), makeContent([day]));

    expect(fetchDailyWeather).toHaveBeenCalled();
    expect(textRuns().some(text => text.includes('東京：'))).toBe(false);
  });

  it('builds the day notes section with the day', async () => {
    const day = makeDay({ notes: 'Bring an umbrella' });

    await exportToDocx(makeTrip(), makeContent([day]));

    expect(makeDayNotesSection).toHaveBeenCalledWith(day);
  });

  it("places the day notes section's paragraphs after the day's header and before its first attraction", async () => {
    const dayHeader = { type: 'Table', options: { day: 1 } };
    const attractionTable = { type: 'Table', options: { attraction: 1 } };
    vi.mocked(makeDayHeaderTable).mockReturnValueOnce(
      dayHeader as unknown as Table,
    );
    vi.mocked(makeAttractionTable).mockResolvedValueOnce(
      attractionTable as unknown as Table,
    );
    const day = makeDay({ attractions: [makeAttraction()] });

    await exportToDocx(makeTrip(), makeContent([day]));

    const documentOptions = vi.mocked(Document).mock.calls[0][0] as {
      sections: [{ children: unknown[] }];
    };
    const children = documentOptions.sections[0].children;
    const headerIndex = children.indexOf(dayHeader);
    const notesIndex = children.indexOf(dayNotesSentinel);
    const attractionIndex = children.indexOf(attractionTable);
    expect(headerIndex).toBeLessThan(notesIndex);
    expect(notesIndex).toBeLessThan(attractionIndex);
  });
});
