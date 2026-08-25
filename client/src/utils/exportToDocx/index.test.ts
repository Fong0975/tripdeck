import { Document, Packer, TextRun, type Paragraph, type Table } from 'docx';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  Attraction,
  DayLocation,
  DayPlan,
  TravelConnection,
  Trip,
  TripContent,
} from '@/types';
import { daysFromToday } from '@/utils/date';
import { downloadBlob } from '@/utils/download';
import { fetchDailyWeather } from '@/utils/weatherApi';

import { makeAttractionTable } from './attractionTable';
import { makeHeaderSection } from './headerSection';
import { makeDayHeaderTable, makeTransportTable } from './transportTable';

import { exportToDocx } from './index';

// `docx` constructors are captured as plain, comparable objects instead of
// real component instances (see markdownToDocx.test.ts for the rationale).
// They are invoked with `new`, so the mock implementation must be a real
// `function` — an arrow function cannot be used as a constructor target.
// `BorderStyle` is mocked because `./constants` reads it at module-init time.
vi.mock('docx', () => ({
  BorderStyle: { NONE: 'none', SINGLE: 'single' },
  Packer: { toBlob: vi.fn() },
  Document: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'Document', options };
  }),
  Paragraph: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'Paragraph', options };
  }),
  TextRun: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'TextRun', options };
  }),
}));

vi.mock('@/utils/date', () => ({ daysFromToday: vi.fn() }));
vi.mock('@/utils/download', () => ({ downloadBlob: vi.fn() }));
vi.mock('@/utils/weatherApi', () => ({
  fetchDailyWeather: vi.fn(),
  isWeatherEnabled: true,
}));
vi.mock('./attractionTable', () => ({ makeAttractionTable: vi.fn() }));
// The header section's own content (title/destination/date/description/
// images) is unit-tested in headerSection.test.ts; here it's stubbed to a
// single sentinel paragraph so this file can focus on orchestration —
// building the day sections and packing/downloading the final document.
vi.mock('./headerSection', () => ({ makeHeaderSection: vi.fn() }));
vi.mock('./transportTable', () => ({
  makeDayHeaderTable: vi.fn(),
  makeTransportTable: vi.fn(),
}));

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 1,
    title: '東京行',
    destination: '東京',
    startDate: '2026-08-20',
    endDate: '2026-08-22',
    description: '第一次去東京',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function content(days: DayPlan[]): TripContent {
  return { tripId: 1, days };
}

function dayPlan(overrides: Partial<DayPlan> = {}): DayPlan {
  return {
    id: 1,
    day: 1,
    date: '2026-08-20',
    locations: [],
    attractions: [],
    connections: [],
    ...overrides,
  };
}

function attraction(overrides: Partial<Attraction> = {}): Attraction {
  return { id: 1, name: '晴空塔', ...overrides };
}

function connection(
  overrides: Partial<TravelConnection> = {},
): TravelConnection {
  return {
    id: 1,
    fromAttractionId: 1,
    toAttractionId: 2,
    transportMode: 'walk',
    ...overrides,
  };
}

function textRuns(): string[] {
  return vi
    .mocked(TextRun)
    .mock.calls.map(([options]) => (options as { text: string }).text);
}

const headerSentinel = { type: 'Paragraph', options: { sentinel: 'header' } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(Packer.toBlob).mockResolvedValue(new Blob(['docx']));
  vi.mocked(makeHeaderSection).mockResolvedValue([
    headerSentinel as unknown as Paragraph,
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
});

describe('exportToDocx', () => {
  it('builds the document, packs it, and downloads it under the trip title', async () => {
    await exportToDocx(trip({ title: '東京行' }), content([]));

    expect(Packer.toBlob).toHaveBeenCalledTimes(1);
    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(downloadBlob).toHaveBeenCalledWith(expect.anything(), '東京行.docx');
  });

  it('builds the header section with the trip and its total day count', async () => {
    const days = [
      dayPlan({ id: 1, day: 1, date: '2026-08-20' }),
      dayPlan({ id: 2, day: 2, date: '2026-08-21' }),
    ];
    const aTrip = trip();

    await exportToDocx(aTrip, content(days));

    expect(makeHeaderSection).toHaveBeenCalledWith(aTrip, 2);
  });

  it('places the header section paragraphs before the day sections', async () => {
    await exportToDocx(trip(), content([]));

    const documentOptions = vi.mocked(Document).mock.calls[0][0] as {
      sections: [{ children: unknown[] }];
    };
    expect(documentOptions.sections[0].children[0]).toBe(headerSentinel);
  });

  it('calls makeDayHeaderTable once per day with isFirstDay true only for the first day', async () => {
    const days = [
      dayPlan({ id: 1, day: 1, date: '2026-08-20' }),
      dayPlan({ id: 2, day: 2, date: '2026-08-21' }),
    ];

    await exportToDocx(trip(), content(days));

    expect(makeDayHeaderTable).toHaveBeenCalledTimes(2);
    expect(vi.mocked(makeDayHeaderTable).mock.calls[0][1]).toBe(true);
    expect(vi.mocked(makeDayHeaderTable).mock.calls[1][1]).toBe(false);
  });

  it('calls makeAttractionTable once per attraction, in order', async () => {
    const a1 = attraction({ id: 1, name: '晴空塔' });
    const a2 = attraction({ id: 2, name: '淺草寺' });
    const day = dayPlan({ attractions: [a1, a2] });

    await exportToDocx(trip(), content([day]));

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
      const a1 = attraction({ id: 1, name: '晴空塔' });
      const a2 = attraction({ id: 2, name: '淺草寺' });
      const conn = connection({ fromAttractionId: 1, toAttractionId });
      const day = dayPlan({ attractions: [a1, a2], connections: [conn] });

      await exportToDocx(trip(), content([day]));

      expect(makeTransportTable).toHaveBeenCalledWith(conn, expectedToName);
    },
  );

  it.each([
    {
      description: 'the day has no locations',
      locations: [] as DayLocation[],
      daysFromTodayValue: 0,
    },
    {
      description: 'the day is in the past',
      locations: [{ id: 1, name: '東京' }] as DayLocation[],
      daysFromTodayValue: -1,
    },
  ])(
    'does not fetch weather when $description',
    async ({ locations, daysFromTodayValue }) => {
      vi.mocked(daysFromToday).mockReturnValue(daysFromTodayValue);
      const day = dayPlan({ locations });

      await exportToDocx(trip(), content([day]));

      expect(fetchDailyWeather).not.toHaveBeenCalled();
    },
  );

  it('adds a weather paragraph when fetchDailyWeather resolves a success status', async () => {
    vi.mocked(daysFromToday).mockReturnValue(0);
    vi.mocked(fetchDailyWeather).mockResolvedValue({
      status: 'success',
      data: {
        resolvedName: '東京',
        icon: 'clear',
        description: '晴天',
        tempMin: 20,
        tempMax: 28,
        humidity: 55,
        pop: 0,
      },
    });
    const day = dayPlan({ locations: [{ id: 1, name: '東京' }] });

    await exportToDocx(trip(), content([day]));

    expect(fetchDailyWeather).toHaveBeenCalledWith('東京', day.date);
    expect(
      textRuns().some(text => text.includes('東京') && text.includes('晴天')),
    ).toBe(true);
  });

  it('appends the rain probability text when pop is greater than 0', async () => {
    vi.mocked(daysFromToday).mockReturnValue(0);
    vi.mocked(fetchDailyWeather).mockResolvedValue({
      status: 'success',
      data: {
        resolvedName: '東京',
        icon: 'rain',
        description: '雨天',
        tempMin: 18,
        tempMax: 22,
        humidity: 80,
        pop: 60,
      },
    });
    const day = dayPlan({ locations: [{ id: 1, name: '東京' }] });

    await exportToDocx(trip(), content([day]));

    expect(textRuns().some(text => text.includes('☂ 60%'))).toBe(true);
  });

  it('adds no weather paragraph when fetchDailyWeather resolves a non-success status', async () => {
    vi.mocked(daysFromToday).mockReturnValue(0);
    vi.mocked(fetchDailyWeather).mockResolvedValue({ status: 'error' });
    const day = dayPlan({ locations: [{ id: 1, name: '東京' }] });

    await exportToDocx(trip(), content([day]));

    expect(fetchDailyWeather).toHaveBeenCalled();
    expect(textRuns().some(text => text.includes('東京：'))).toBe(false);
  });
});
