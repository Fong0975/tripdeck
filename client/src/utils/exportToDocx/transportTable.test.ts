import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AttractionImage, TravelConnection } from '@/types';

import {
  CONTENT_WIDTH_DXA,
  FONT,
  NO_BORDER,
  TRANSPORT_BORDER,
} from './constants';
import { makeImageParagraphs } from './imageHelpers';
import { makeDayHeaderTable, makeTransportTable } from './transportTable';

// `docx` constructors are captured as plain, comparable objects instead of
// real component instances (see markdownToDocx.test.ts for the rationale).
// They are invoked with `new`, so the mock implementation must be a real
// `function` — an arrow function cannot be used as a constructor target.
// `BorderStyle`/`WidthType`/`ShadingType` are mocked because `./constants`
// and this module read them at module-init time.
vi.mock('docx', () => ({
  BorderStyle: { NONE: 'none', SINGLE: 'single' },
  ShadingType: { SOLID: 'solid' },
  WidthType: { DXA: 'dxa' },
  Paragraph: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'Paragraph', options };
  }),
  Table: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'Table', options };
  }),
  TableCell: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'TableCell', options };
  }),
  TableRow: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'TableRow', options };
  }),
  TextRun: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'TextRun', options };
  }),
}));

vi.mock('./imageHelpers', () => ({
  makeImageParagraphs: vi.fn().mockResolvedValue([]),
}));

type MockNode = { type: string; options: Record<string, any> };

function rows(table: unknown): MockNode[] {
  return (table as MockNode).options.rows;
}

function cellChildren(table: unknown): MockNode[] {
  return rows(table)[0].options.children[0].options.children;
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

function image(overrides: Partial<AttractionImage> = {}): AttractionImage {
  return { id: 1, filename: 'photo.jpg', title: '', ...overrides };
}

function textRun(text: string, extra: Record<string, unknown> = {}) {
  return { type: 'TextRun', options: { text, font: FONT, ...extra } };
}

function paragraph(children: unknown[], extra: Record<string, unknown> = {}) {
  return { type: 'Paragraph', options: { children, ...extra } };
}

beforeEach(() => {
  vi.mocked(makeImageParagraphs).mockReset().mockResolvedValue([]);
});

describe('makeDayHeaderTable', () => {
  it.each([
    {
      description: 'the first day',
      isFirstDay: true,
      expectedPageBreakBefore: false,
    },
    {
      description: 'a later day',
      isFirstDay: false,
      expectedPageBreakBefore: true,
    },
  ])(
    'builds the header table for $description',
    ({ isFirstDay, expectedPageBreakBefore }) => {
      const text = '第 1 天 · 8月20日 (星期四)';

      const table = makeDayHeaderTable(text, isFirstDay);

      expect(table).toEqual({
        type: 'Table',
        options: {
          width: { size: CONTENT_WIDTH_DXA, type: 'dxa' },
          borders: {
            top: NO_BORDER,
            bottom: NO_BORDER,
            left: NO_BORDER,
            right: NO_BORDER,
            insideHorizontal: NO_BORDER,
            insideVertical: NO_BORDER,
          },
          rows: [
            {
              type: 'TableRow',
              options: {
                children: [
                  {
                    type: 'TableCell',
                    options: {
                      width: { size: CONTENT_WIDTH_DXA, type: 'dxa' },
                      shading: {
                        type: 'solid',
                        fill: '1D4ED8',
                        color: 'auto',
                      },
                      margins: { top: 160, bottom: 160, left: 200, right: 200 },
                      borders: {
                        top: NO_BORDER,
                        bottom: NO_BORDER,
                        left: NO_BORDER,
                        right: NO_BORDER,
                      },
                      children: [
                        paragraph(
                          [
                            textRun(text, {
                              bold: true,
                              color: 'FFFFFF',
                              size: 28,
                            }),
                          ],
                          {
                            pageBreakBefore: expectedPageBreakBefore,
                            spacing: { before: 0, after: 0 },
                          },
                        ),
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      });
    },
  );
});

describe('makeTransportTable', () => {
  it('wraps the cell content in a 1x1 table with top/bottom transport borders', async () => {
    const table = await makeTransportTable(connection(), '');

    expect(table).toMatchObject({
      type: 'Table',
      options: {
        width: { size: CONTENT_WIDTH_DXA, type: 'dxa' },
        borders: {
          top: TRANSPORT_BORDER,
          bottom: TRANSPORT_BORDER,
          left: NO_BORDER,
          right: NO_BORDER,
          insideHorizontal: NO_BORDER,
          insideVertical: NO_BORDER,
        },
        rows: [
          {
            type: 'TableRow',
            options: {
              children: [
                {
                  type: 'TableCell',
                  options: {
                    width: { size: CONTENT_WIDTH_DXA, type: 'dxa' },
                    borders: {
                      top: TRANSPORT_BORDER,
                      bottom: TRANSPORT_BORDER,
                      left: NO_BORDER,
                      right: NO_BORDER,
                    },
                    margins: { top: 120, bottom: 120, left: 0, right: 0 },
                  },
                },
              ],
            },
          },
        ],
      },
    });
  });

  it.each([
    {
      description: 'no duration and no destination name',
      duration: undefined,
      toName: '',
      expectedHeader: '交通方式：步行',
    },
    {
      description: 'a numeric-minutes duration is set',
      duration: '90',
      toName: '',
      expectedHeader: '交通方式：步行 · 1 小時 30 分鐘',
    },
    {
      description: 'a legacy free-text duration is set',
      duration: '約十分鐘',
      toName: '',
      expectedHeader: '交通方式：步行 · 約十分鐘',
    },
    {
      description: 'a destination name is set',
      duration: undefined,
      toName: '淺草寺',
      expectedHeader: '交通方式：步行 → 淺草寺',
    },
    {
      description: 'both a duration and a destination name are set',
      duration: '90',
      toName: '淺草寺',
      expectedHeader: '交通方式：步行 · 1 小時 30 分鐘 → 淺草寺',
    },
  ])(
    'builds the header text when $description',
    async ({ duration, toName, expectedHeader }) => {
      const table = await makeTransportTable(connection({ duration }), toName);

      expect(cellChildren(table)[0]).toEqual(
        paragraph([textRun(expectedHeader, { bold: true })], {
          spacing: { before: 40, after: 40 },
        }),
      );
    },
  );

  it('adds a route line only when conn.route is set', async () => {
    const withRoute = await makeTransportTable(
      connection({ route: 'JR山手線' }),
      '',
    );
    const withoutRoute = await makeTransportTable(connection(), '');

    expect(cellChildren(withRoute)[1]).toEqual(
      paragraph([textRun('路線：JR山手線')], {
        spacing: { before: 40, after: 40 },
      }),
    );
    expect(cellChildren(withoutRoute)).toHaveLength(1);
  });

  it('splits multi-line notes into one paragraph per line', async () => {
    const table = await makeTransportTable(
      connection({ notes: '注意月台\n\n記得刷卡' }),
      '',
    );

    expect(cellChildren(table).slice(1)).toEqual([
      paragraph([textRun('注意月台')], { spacing: { before: 20, after: 20 } }),
      paragraph([], { spacing: { before: 20, after: 20 } }),
      paragraph([textRun('記得刷卡')], { spacing: { before: 20, after: 20 } }),
    ]);
  });

  it('delegates to makeImageParagraphs for each connection image, in order', async () => {
    const img1 = image({ id: 1, filename: 'a.jpg' });
    const img2 = image({ id: 2, filename: 'b.jpg' });
    vi.mocked(makeImageParagraphs).mockImplementation(async img => [
      { type: 'Paragraph', options: { marker: img.filename } } as never,
    ]);

    const table = await makeTransportTable(
      connection({ images: [img1, img2] }),
      '',
    );

    expect(makeImageParagraphs).toHaveBeenNthCalledWith(1, img1);
    expect(makeImageParagraphs).toHaveBeenNthCalledWith(2, img2);
    expect(cellChildren(table).slice(-2)).toEqual([
      { type: 'Paragraph', options: { marker: 'a.jpg' } },
      { type: 'Paragraph', options: { marker: 'b.jpg' } },
    ]);
  });
});
