import { TextRun } from 'docx';
import { vi } from 'vitest';

import { FONT } from '@/utils/exportToDocx/constants';

/**
 * Helpers for asserting against the `{ type, options }` objects produced by
 * the `docx` manual mock (`client/__mocks__/docx.ts`). Only usable from test
 * files that call `vi.mock('docx')`.
 */

/** A captured `docx` component: its constructor name and options. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockNode = { type: string; options: Record<string, any> };

/**
 * Builds the expected mocked `TextRun` for `text` in the default body font.
 *
 * @param text - The run's text.
 * @param extra - Additional run options (e.g. `bold`, `size`, `color`).
 */
export function textRun(text: string, extra: Record<string, unknown> = {}) {
  return { type: 'TextRun', options: { text, font: FONT, ...extra } };
}

/** Returns the `text` option of every `TextRun` constructed so far. */
export function textRuns(): string[] {
  return vi
    .mocked(TextRun)
    .mock.calls.map(([options]) => (options as { text: string }).text);
}

/** Returns the rows of a mocked `Table`. */
export function rows(table: unknown): MockNode[] {
  return (table as MockNode).options.rows;
}
