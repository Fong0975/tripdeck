import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AttractionImage } from '@/types';

import { CONTENT_WIDTH_PX, FONT, HALF_WIDTH_PX } from './constants';
import { makeImageParagraphs } from './imageHelpers';

// `docx` constructors are captured as plain, comparable objects instead of
// real component instances (see markdownToDocx.test.ts for the rationale).
// They are invoked with `new`, so the mock implementation must be a real
// `function` — an arrow function cannot be used as a constructor target.
vi.mock('docx', () => ({
  BorderStyle: { NONE: 'none', SINGLE: 'single' },
  ImageRun: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'ImageRun', options };
  }),
  Paragraph: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'Paragraph', options };
  }),
  TextRun: vi.fn().mockImplementation(function (options: unknown) {
    return { type: 'TextRun', options };
  }),
}));

function image(overrides: Partial<AttractionImage> = {}): AttractionImage {
  return { id: 1, filename: 'photo.jpg', title: '', ...overrides };
}

function makeResponse(
  ok: boolean,
  buffer: ArrayBuffer,
  contentType: string | null,
): Response {
  return {
    ok,
    arrayBuffer: () => Promise.resolve(buffer),
    headers: { get: () => contentType },
  } as unknown as Response;
}

function textRun(text: string, extra: Record<string, unknown> = {}) {
  return { type: 'TextRun', options: { text, font: FONT, ...extra } };
}

function errorParagraph(title?: string) {
  return {
    type: 'Paragraph',
    options: {
      children: [
        textRun(`[圖片無法載入${title ? `: ${title}` : ''}]`, {
          color: 'AA0000',
        }),
      ],
    },
  };
}

// jsdom's `Image` never fires `onload`/`onerror` on its own, so it's replaced
// with a fake whose `src` setter synchronously resolves or rejects based on
// the natural size / error flag configured on the class before each test.
class FakeImage {
  static naturalWidth = 800;
  static naturalHeight = 600;
  static shouldError = false;

  onload: (() => void) | null = null;
  onerror: ((err: unknown) => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;

  set src(_value: string) {
    if (FakeImage.shouldError) {
      this.onerror?.(new Error('decode failed'));
      return;
    }
    this.naturalWidth = FakeImage.naturalWidth;
    this.naturalHeight = FakeImage.naturalHeight;
    this.onload?.();
  }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn().mockReturnValue('blob:mock'),
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal('Image', FakeImage);
  FakeImage.naturalWidth = 800;
  FakeImage.naturalHeight = 600;
  FakeImage.shouldError = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('makeImageParagraphs', () => {
  it.each([
    {
      description: 'content-type sniffed as png',
      contentType: 'image/png',
      filename: 'photo.bin',
      expectedType: 'png',
    },
    {
      description: 'content-type missing, sniffed from the .png extension',
      contentType: null,
      filename: 'photo.png',
      expectedType: 'png',
    },
    {
      description: 'content-type generic, sniffed from the .gif extension',
      contentType: 'application/octet-stream',
      filename: 'photo.gif',
      expectedType: 'gif',
    },
    {
      description: 'content-type missing, sniffed from the .bmp extension',
      contentType: null,
      filename: 'photo.bmp',
      expectedType: 'bmp',
    },
    {
      description: 'no content-type or recognized extension defaults to jpg',
      contentType: null,
      filename: 'photo',
      expectedType: 'jpg',
    },
  ])(
    'renders an ImageRun with the sniffed type when $description',
    async ({ contentType, filename, expectedType }) => {
      vi.mocked(fetch).mockResolvedValue(
        makeResponse(true, new ArrayBuffer(4), contentType),
      );

      const result = await makeImageParagraphs(image({ filename }));

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'Paragraph',
        options: {
          children: [{ type: 'ImageRun', options: { type: expectedType } }],
        },
      });
    },
  );

  it('returns an empty array for svg images (unsupported by docx)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(true, new ArrayBuffer(4), 'image/svg+xml'),
    );

    const result = await makeImageParagraphs(image({ filename: 'icon.svg' }));

    expect(result).toEqual([]);
  });

  it.each([
    {
      description: 'a natural size below HALF_WIDTH_PX clamps up',
      naturalWidth: 100,
      naturalHeight: 50,
      expectedWidth: HALF_WIDTH_PX,
      expectedHeight: Math.round((HALF_WIDTH_PX / 100) * 50),
    },
    {
      description: 'a natural size between the bounds is kept as-is',
      naturalWidth: 400,
      naturalHeight: 200,
      expectedWidth: 400,
      expectedHeight: 200,
    },
    {
      description: 'a natural size above CONTENT_WIDTH_PX clamps down',
      naturalWidth: 1200,
      naturalHeight: 600,
      expectedWidth: CONTENT_WIDTH_PX,
      expectedHeight: Math.round((CONTENT_WIDTH_PX / 1200) * 600),
    },
  ])(
    'computes clamped dimensions when $description',
    async ({ naturalWidth, naturalHeight, expectedWidth, expectedHeight }) => {
      FakeImage.naturalWidth = naturalWidth;
      FakeImage.naturalHeight = naturalHeight;
      vi.mocked(fetch).mockResolvedValue(
        makeResponse(true, new ArrayBuffer(4), 'image/jpeg'),
      );

      const result = await makeImageParagraphs(image());

      expect(result[0]).toMatchObject({
        options: {
          children: [
            {
              options: {
                transformation: {
                  width: expectedWidth,
                  height: expectedHeight,
                },
              },
            },
          ],
        },
      });
    },
  );

  it.each([
    { description: 'a title is present', title: '夕陽', expectCaption: true },
    { description: 'no title is present', title: '', expectCaption: false },
  ])(
    'appends a caption paragraph only when $description',
    async ({ title, expectCaption }) => {
      vi.mocked(fetch).mockResolvedValue(
        makeResponse(true, new ArrayBuffer(4), 'image/jpeg'),
      );

      const result = await makeImageParagraphs(image({ title }));

      expect(result).toHaveLength(expectCaption ? 2 : 1);
      if (expectCaption) {
        expect(result[1]).toEqual({
          type: 'Paragraph',
          options: {
            children: [
              textRun(title, { italics: true, color: '777777', size: 18 }),
            ],
            spacing: { before: 0, after: 60 },
          },
        });
      }
    },
  );

  it.each([
    { description: 'with a title', title: '夕陽' },
    { description: 'without a title', title: '' },
  ])(
    'falls back to an error paragraph when the fetch fails, $description',
    async ({ title }) => {
      vi.mocked(fetch).mockResolvedValue(
        makeResponse(false, new ArrayBuffer(0), null),
      );

      const result = await makeImageParagraphs(image({ title }));

      expect(result).toEqual([errorParagraph(title || undefined)]);
    },
  );

  it('falls back to an error paragraph when the Image onerror fires', async () => {
    FakeImage.shouldError = true;
    vi.mocked(fetch).mockResolvedValue(
      makeResponse(true, new ArrayBuffer(4), 'image/jpeg'),
    );

    const result = await makeImageParagraphs(image());

    expect(result).toEqual([errorParagraph()]);
  });
});
