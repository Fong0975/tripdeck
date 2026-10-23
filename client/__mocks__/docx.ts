import { vi } from 'vitest';

/**
 * Package-level manual mock for `docx`, activated with `vi.mock('docx')`.
 *
 * `docx` builds a nested XML component tree that isn't practical to assert
 * against directly, so each constructor call is captured as a plain,
 * comparable `{ type, options }` object instead. The enums are mocked too
 * because `src/utils/exportToDocx/constants.ts` reads them at module-init
 * time. Constructors are invoked with `new`, so their mock implementation
 * must be a real `function` — an arrow function cannot be used as a
 * constructor target and would throw when Vitest calls it via `new`.
 */
function mockComponent(type: string) {
  return vi.fn(function (options: unknown) {
    return { type, options };
  });
}

export const AlignmentType = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
};
export const BorderStyle = { NONE: 'none', SINGLE: 'single' };
export const HeadingLevel = { HEADING_1: 'Heading1' };
export const ShadingType = { SOLID: 'solid' };
export const WidthType = { DXA: 'dxa', PERCENTAGE: 'pct' };

export const Document = mockComponent('Document');
export const ExternalHyperlink = mockComponent('ExternalHyperlink');
export const ImageRun = mockComponent('ImageRun');
export const Paragraph = mockComponent('Paragraph');
export const Table = mockComponent('Table');
export const TableCell = mockComponent('TableCell');
export const TableRow = mockComponent('TableRow');
export const TextRun = mockComponent('TextRun');

export const Packer = { toBlob: vi.fn() };
