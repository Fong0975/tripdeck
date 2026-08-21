import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Attraction, AttractionImage } from '@/types';

import { makeAttractionTable } from './attractionTable';
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

// `docx` constructors are captured as plain, comparable objects instead of
// real component instances (see markdownToDocx.test.ts for the rationale).
// They are invoked with `new`, so the mock implementation must be a real
// `function` — an arrow function cannot be used as a constructor target.
// `BorderStyle`/`WidthType` are mocked because `./constants` reads them at
// module-init time (docx is mocked module-wide, not just the symbols below).
vi.mock('docx', () => ({
  BorderStyle: { NONE: 'none', SINGLE: 'single' },
  WidthType: { DXA: 'dxa' },
  ExternalHyperlink: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'ExternalHyperlink', options };
  }),
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

vi.mock('./markdownToDocx', () => ({
  parseMarkdownContent: vi.fn().mockReturnValue([]),
}));

type MockNode = { type: string; options: Record<string, any> };

function rows(table: unknown): MockNode[] {
  return (table as MockNode).options.rows;
}

function attraction(overrides: Partial<Attraction> = {}): Attraction {
  return { id: 1, name: '晴空塔', ...overrides };
}

function image(overrides: Partial<AttractionImage> = {}): AttractionImage {
  return { id: 1, filename: 'photo.jpg', title: '', ...overrides };
}

function fakeParagraph(marker: string): MockNode {
  return { type: 'Paragraph', options: { marker } };
}

function textRun(text: string, extra: Record<string, unknown> = {}) {
  return { type: 'TextRun', options: { text, font: FONT, ...extra } };
}

function link(text: string, url: string) {
  return {
    type: 'ExternalHyperlink',
    options: { link: url, children: [textRun(text, { style: 'Hyperlink' })] },
  };
}

function paragraph(children: unknown[]) {
  return { type: 'Paragraph', options: { children } };
}

function tableRow(children: unknown[]) {
  return { type: 'TableRow', options: { children } };
}

function labelCell(children: unknown[]) {
  return {
    type: 'TableCell',
    options: {
      width: { size: COL_W, type: 'dxa' },
      borders: ALL_BORDERS,
      margins: { top: 80, bottom: 80, left: 160, right: 160 },
      children,
    },
  };
}

function valueCell(children: unknown[]) {
  return {
    type: 'TableCell',
    options: {
      columnSpan: 3,
      width: { size: COL_3R, type: 'dxa' },
      borders: ALL_BORDERS,
      margins: { top: 80, bottom: 80, left: 160, right: 160 },
      children,
    },
  };
}

function timeCell(children: unknown[]) {
  return {
    type: 'TableCell',
    options: {
      columnSpan: 2,
      width: { size: COL_2L, type: 'dxa' },
      borders: ALL_BORDERS,
      margins: { top: 80, bottom: 80, left: 160, right: 160 },
      children,
    },
  };
}

function mapCell(children: unknown[]) {
  return {
    type: 'TableCell',
    options: {
      columnSpan: 2,
      width: { size: COL_2R, type: 'dxa' },
      borders: ALL_BORDERS,
      margins: { top: 80, bottom: 80, left: 160, right: 160 },
      children,
    },
  };
}

beforeEach(() => {
  vi.mocked(makeImageParagraphs).mockResolvedValue([]);
  vi.mocked(parseMarkdownContent).mockReturnValue([]);
});

describe('makeAttractionTable', () => {
  it('renders row 1 (name) and the table wrapper when nothing else is set', async () => {
    const table = await makeAttractionTable(attraction());

    expect(table).toEqual({
      type: 'Table',
      options: {
        width: { size: CONTENT_WIDTH_DXA, type: 'dxa' },
        columnWidths: [COL_W, COL_W, COL_W, CONTENT_WIDTH_DXA - COL_W * 3],
        borders: {
          top: CELL_BORDER,
          bottom: CELL_BORDER,
          left: CELL_BORDER,
          right: CELL_BORDER,
          insideHorizontal: CELL_BORDER,
          insideVertical: CELL_BORDER,
        },
        rows: [
          tableRow([
            {
              type: 'TableCell',
              options: {
                columnSpan: 4,
                width: { size: CONTENT_WIDTH_DXA, type: 'dxa' },
                borders: ALL_BORDERS,
                margins: { top: 120, bottom: 120, left: 160, right: 160 },
                children: [
                  paragraph([textRun('晴空塔', { bold: true, size: 26 })]),
                ],
              },
            },
          ]),
        ],
      },
    });
  });

  it('renders the time+map row with both cells populated', async () => {
    const table = await makeAttractionTable(
      attraction({
        startTime: '09:00',
        endTime: '11:00',
        googleMapUrl: 'https://maps.example.com/place',
      }),
    );

    expect(rows(table)[1]).toEqual(
      tableRow([
        timeCell([paragraph([textRun('🕐 09:00 – 11:00')])]),
        mapCell([
          paragraph([
            textRun('📍 '),
            link('Google Maps', 'https://maps.example.com/place'),
          ]),
        ]),
      ]),
    );
  });

  it.each([
    {
      description: 'only startTime is set',
      startTime: '09:00',
      endTime: null,
      googleMapUrl: null,
    },
    {
      description: 'only endTime is set',
      startTime: null,
      endTime: '11:00',
      googleMapUrl: null,
    },
    {
      description: 'only googleMapUrl is set',
      startTime: null,
      endTime: null,
      googleMapUrl: 'https://maps.example.com',
    },
  ])(
    'adds the time+map row when $description',
    async ({ startTime, endTime, googleMapUrl }) => {
      const table = await makeAttractionTable(
        attraction({ startTime, endTime, googleMapUrl }),
      );

      expect(rows(table)).toHaveLength(2);
    },
  );

  it('omits the time+map row when neither time nor map url is set', async () => {
    const table = await makeAttractionTable(attraction());

    expect(rows(table)).toHaveLength(1);
  });

  it('renders the notes+images row combining parsed notes and image paragraphs', async () => {
    vi.mocked(parseMarkdownContent).mockReturnValue([
      fakeParagraph('notes') as never,
    ]);
    vi.mocked(makeImageParagraphs).mockResolvedValue([
      fakeParagraph('image') as never,
    ]);
    const img = image();

    const table = await makeAttractionTable(
      attraction({ notes: '重點筆記', images: [img] }),
    );

    expect(parseMarkdownContent).toHaveBeenCalledWith('重點筆記');
    expect(makeImageParagraphs).toHaveBeenCalledWith(img);
    expect(rows(table)[1]).toEqual(
      tableRow([
        {
          type: 'TableCell',
          options: {
            columnSpan: 4,
            width: { size: CONTENT_WIDTH_DXA, type: 'dxa' },
            borders: ALL_BORDERS,
            margins: { top: 100, bottom: 100, left: 160, right: 160 },
            children: [fakeParagraph('notes'), fakeParagraph('image')],
          },
        },
      ]),
    );
  });

  it.each([
    { description: 'only notes is set', notes: '重點筆記', images: undefined },
    { description: 'only images is set', notes: undefined, images: [image()] },
  ])(
    'adds the notes+images row when $description',
    async ({ notes, images }) => {
      vi.mocked(parseMarkdownContent).mockReturnValue(
        notes ? [fakeParagraph('notes') as never] : [],
      );
      vi.mocked(makeImageParagraphs).mockResolvedValue(
        images ? [fakeParagraph('image') as never] : [],
      );

      const table = await makeAttractionTable(attraction({ notes, images }));

      expect(rows(table)).toHaveLength(2);
    },
  );

  it.each([
    {
      description: 'neither notes nor images is set',
      notes: undefined,
      images: undefined,
    },
    {
      description: 'notes is whitespace only and no images are set',
      notes: '   ',
      images: undefined,
    },
  ])(
    'omits the notes+images row when $description',
    async ({ notes, images }) => {
      const table = await makeAttractionTable(attraction({ notes, images }));

      expect(rows(table)).toHaveLength(1);
    },
  );

  it('renders the nearby-attractions row with label and value cells', async () => {
    const table = await makeAttractionTable(
      attraction({ nearbyAttractions: '晴空塔、淺草寺' }),
    );

    expect(rows(table)[1]).toEqual(
      tableRow([
        labelCell([paragraph([textRun('附近景點', { bold: true, size: 20 })])]),
        valueCell([paragraph([textRun('晴空塔、淺草寺')])]),
      ]),
    );
  });

  it.each([
    { description: 'undefined', nearbyAttractions: undefined },
    { description: 'an empty string', nearbyAttractions: '' },
    { description: 'whitespace only', nearbyAttractions: '   ' },
  ])(
    'omits the nearby-attractions row when nearbyAttractions is $description',
    async ({ nearbyAttractions }) => {
      const table = await makeAttractionTable(
        attraction({ nearbyAttractions }),
      );

      expect(rows(table)).toHaveLength(1);
    },
  );

  it('adds no reference-website rows when none are set', async () => {
    const table = await makeAttractionTable(attraction());

    expect(rows(table)).toHaveLength(1);
  });

  it('adds one row per reference website, labeling only the first', async () => {
    const websites = [
      { url: 'https://a.example.com', title: 'A' },
      { url: 'https://b.example.com', title: '' },
    ];

    const table = await makeAttractionTable(
      attraction({ referenceWebsites: websites }),
    );

    expect(rows(table).slice(1)).toEqual([
      tableRow([
        labelCell([paragraph([textRun('參考網站', { bold: true, size: 20 })])]),
        valueCell([paragraph([link('A', 'https://a.example.com')])]),
      ]),
      tableRow([
        labelCell([paragraph([])]),
        valueCell([
          paragraph([link('https://b.example.com', 'https://b.example.com')]),
        ]),
      ]),
    ]);
  });
});
