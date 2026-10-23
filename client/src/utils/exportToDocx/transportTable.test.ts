import { beforeEach, describe, expect, it, vi } from 'vitest';

import { rows, textRun, type MockNode } from '@/test-utils/docx';
import { makeConnection, makeImage } from '@/test-utils/fixtures';

import { CONTENT_WIDTH_DXA, NO_BORDER, TRANSPORT_BORDER } from './constants';
import { makeImageParagraphs } from './imageHelpers';
import { parseMarkdownContent } from './markdownToDocx';
import { makeDayHeaderTable, makeTransportTable } from './transportTable';

vi.mock('docx');

vi.mock('./imageHelpers', () => ({
  makeImageParagraphs: vi.fn().mockResolvedValue([]),
}));

vi.mock('./markdownToDocx', () => ({
  parseMarkdownContent: vi.fn().mockReturnValue([]),
}));

function cellChildren(table: unknown): MockNode[] {
  return rows(table)[0].options.children[0].options.children;
}

function paragraph(children: unknown[], extra: Record<string, unknown> = {}) {
  return { type: 'Paragraph', options: { children, ...extra } };
}

beforeEach(() => {
  vi.mocked(makeImageParagraphs).mockReset().mockResolvedValue([]);
  vi.mocked(parseMarkdownContent).mockReset().mockReturnValue([]);
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
    const table = await makeTransportTable(makeConnection(), '');

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
      const table = await makeTransportTable(
        makeConnection({ duration }),
        toName,
      );

      expect(cellChildren(table)[0]).toEqual(
        paragraph([textRun(expectedHeader, { bold: true })], {
          spacing: { before: 40, after: 40 },
        }),
      );
    },
  );

  it('adds a labelled, markdown-parsed route block only when conn.route is set', async () => {
    vi.mocked(parseMarkdownContent).mockReturnValue([
      { type: 'Paragraph', options: { marker: 'route' } } as never,
    ]);

    const withRoute = await makeTransportTable(
      makeConnection({ route: '[JR山手線](https://demo.com)' }),
      '',
    );
    const withoutRoute = await makeTransportTable(makeConnection(), '');

    expect(parseMarkdownContent).toHaveBeenCalledWith(
      '[JR山手線](https://demo.com)',
    );
    expect(cellChildren(withRoute).slice(1)).toEqual([
      paragraph([textRun('路線', { bold: true, size: 20 })], {
        spacing: { before: 40, after: 20 },
      }),
      { type: 'Paragraph', options: { marker: 'route' } },
    ]);
    expect(cellChildren(withoutRoute)).toHaveLength(1);
  });

  it('splits multi-line notes into one paragraph per line', async () => {
    const table = await makeTransportTable(
      makeConnection({ notes: '注意月台\n\n記得刷卡' }),
      '',
    );

    expect(cellChildren(table).slice(1)).toEqual([
      paragraph([textRun('注意月台')], { spacing: { before: 20, after: 20 } }),
      paragraph([], { spacing: { before: 20, after: 20 } }),
      paragraph([textRun('記得刷卡')], { spacing: { before: 20, after: 20 } }),
    ]);
  });

  it('delegates to makeImageParagraphs for each connection image, in order', async () => {
    const img1 = makeImage({ id: 1, filename: 'a.jpg' });
    const img2 = makeImage({ id: 2, filename: 'b.jpg' });
    vi.mocked(makeImageParagraphs).mockImplementation(async img => [
      { type: 'Paragraph', options: { marker: img.filename } } as never,
    ]);

    const table = await makeTransportTable(
      makeConnection({ images: [img1, img2] }),
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
