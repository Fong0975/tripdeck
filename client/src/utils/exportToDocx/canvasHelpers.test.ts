import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  canvasFont,
  fillRoundRect,
  fitText,
  renderCanvasToPng,
  strokeRoundRect,
} from './canvasHelpers';

/** Minimal 2D context: every call is a spy and text is 7px per character. */
function makeContext() {
  return {
    scale: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
  };
}

type TestContext = ReturnType<typeof makeContext>;

function asContext(ctx: TestContext): CanvasRenderingContext2D {
  return ctx as unknown as CanvasRenderingContext2D;
}

/**
 * Stubs the canvas the picture is drawn on.
 *
 * @param context - What `getContext` returns (`null` = unavailable).
 * @param pngBytes - The encoded PNG bytes, or `null` to make `toBlob` fail.
 */
function stubCanvas(context: TestContext | null, pngBytes: ArrayBuffer | null) {
  const blob = pngBytes
    ? ({ arrayBuffer: () => Promise.resolve(pngBytes) } as Blob)
    : null;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D | null,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback =>
    callback(blob),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('canvasFont', () => {
  it.each([
    { size: 12, weight: undefined, prefix: 'normal 12px' },
    { size: 16, weight: 'bold' as const, prefix: 'bold 16px' },
  ])('builds "$prefix" fonts', ({ size, weight, prefix }) => {
    expect(canvasFont(size, weight)).toContain(prefix);
  });
});

describe('fitText', () => {
  it.each([
    { text: 'abc', maxWidth: 100, expected: 'abc' },
    { text: 'abcdefghij', maxWidth: 70, expected: 'abcdefghij' },
    { text: 'abcdefghij', maxWidth: 40, expected: 'abcd…' },
    { text: 'abcdefghij', maxWidth: 3, expected: '…' },
  ])(
    'fits "$text" into $maxWidth px as "$expected"',
    ({ text, maxWidth, expected }) => {
      expect(fitText(asContext(makeContext()), text, maxWidth)).toBe(expected);
    },
  );
});

describe('round rectangles', () => {
  it.each([
    { name: 'fillRoundRect', draw: fillRoundRect, painted: 'fill' as const },
    {
      name: 'strokeRoundRect',
      draw: strokeRoundRect,
      painted: 'stroke' as const,
    },
  ])('$name traces the path and paints it', ({ draw, painted }) => {
    const ctx = makeContext();

    draw(asContext(ctx), 1, 2, 30, 40, 5);

    expect(ctx.roundRect).toHaveBeenCalledWith(1, 2, 30, 40, 5);
    expect(ctx[painted]).toHaveBeenCalledTimes(1);
  });
});

describe('renderCanvasToPng', () => {
  it('draws on a scaled canvas and returns the PNG bytes', async () => {
    const png = new ArrayBuffer(8);
    const context = makeContext();
    stubCanvas(context, png);
    const draw = vi.fn();

    await expect(renderCanvasToPng(100, 50, 2, draw)).resolves.toBe(png);

    expect(context.scale).toHaveBeenCalledWith(2, 2);
    expect(draw).toHaveBeenCalledWith(context);
  });

  it.each([
    {
      description: 'the 2D context is unavailable',
      context: null,
      png: new ArrayBuffer(1),
      message: 'Canvas 2D context unavailable',
    },
    {
      description: 'PNG encoding fails',
      context: makeContext(),
      png: null,
      message: 'PNG encoding failed',
    },
  ])('throws when $description', async ({ context, png, message }) => {
    stubCanvas(context, png);

    await expect(renderCanvasToPng(10, 10, 1, vi.fn())).rejects.toThrow(
      message,
    );
  });
});
