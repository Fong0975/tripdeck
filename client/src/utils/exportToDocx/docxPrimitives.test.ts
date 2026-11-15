import { describe, expect, it, vi } from 'vitest';

import { textRun as expectedTextRun } from '@/test-utils/docx';

import { ALL_BORDERS, CELL_BORDER, NO_BORDER } from './constants';
import { borderedCell, textRun, uniformTableBorders } from './docxPrimitives';

vi.mock('docx');

describe('textRun', () => {
  it.each([
    { description: 'plain text', options: undefined, extra: {} },
    {
      description: 'extra formatting',
      options: { bold: true, size: 20 },
      extra: { bold: true, size: 20 },
    },
    {
      description: 'a hyperlink style',
      options: { style: 'Hyperlink' },
      extra: { style: 'Hyperlink' },
    },
  ])('builds a body-font run with $description', ({ options, extra }) => {
    expect(textRun('文字', options)).toEqual(expectedTextRun('文字', extra));
  });
});

describe('borderedCell', () => {
  const children = [{ type: 'Paragraph', options: { children: [] } }];

  it.each([
    {
      description: 'without a column span',
      columnSpan: undefined,
      expectedSpan: {},
    },
    {
      description: 'with a column span',
      columnSpan: 3,
      expectedSpan: { columnSpan: 3 },
    },
  ])(
    'builds a fully bordered, padded DXA cell $description',
    ({ columnSpan, expectedSpan }) => {
      expect(
        borderedCell({
          width: 1234,
          paddingY: 80,
          columnSpan,
          children: children as never,
        }),
      ).toEqual({
        type: 'TableCell',
        options: {
          ...expectedSpan,
          width: { size: 1234, type: 'dxa' },
          borders: ALL_BORDERS,
          margins: { top: 80, bottom: 80, left: 160, right: 160 },
          children,
        },
      });
    },
  );

  it('omits the columnSpan key entirely when no span is given', () => {
    const cell = borderedCell({
      width: 1,
      paddingY: 0,
      children: [],
    }) as unknown as { options: Record<string, unknown> };

    expect(cell.options).not.toHaveProperty('columnSpan');
  });
});

describe('uniformTableBorders', () => {
  it.each([
    { description: 'cell', border: CELL_BORDER },
    { description: 'no', border: NO_BORDER },
  ])('applies the $description border to every edge', ({ border }) => {
    expect(uniformTableBorders(border)).toEqual({
      top: border,
      bottom: border,
      left: border,
      right: border,
      insideHorizontal: border,
      insideVertical: border,
    });
  });
});
