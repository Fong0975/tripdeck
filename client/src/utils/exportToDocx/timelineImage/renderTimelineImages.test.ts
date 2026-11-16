import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeAttraction, makeDay } from '@/test-utils/fixtures';

import { renderTimelineImages } from './renderTimelineImages';
import { IMAGE_SCALE, planTimelineImages } from './timelineImageLayout';

const days = [
  makeDay({
    attractions: [makeAttraction({ startTime: '09:00', endTime: '10:00' })],
  }),
];

function makeContext() {
  return {
    scale: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
  };
}

/**
 * Stubs the canvas the picture is drawn on.
 *
 * @param context - What `getContext` returns (`null` = unavailable).
 * @param pngBytes - The encoded PNG bytes, or `null` to make `toBlob` fail.
 */
function stubCanvas(
  context: ReturnType<typeof makeContext> | null,
  pngBytes: ArrayBuffer | null,
) {
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

describe('renderTimelineImages', () => {
  it('returns no images when no attraction has a time', async () => {
    stubCanvas(makeContext(), new ArrayBuffer(1));

    await expect(
      renderTimelineImages([makeDay({ attractions: [makeAttraction()] })]),
    ).resolves.toEqual([]);
  });

  it('renders one PNG per planned image at its display size', async () => {
    const png = new ArrayBuffer(8);
    const context = makeContext();
    stubCanvas(context, png);
    const [plan] = planTimelineImages(days);

    await expect(renderTimelineImages(days)).resolves.toEqual([
      { data: png, width: plan.displayWidth, height: plan.displayHeight },
    ]);
    expect(context.scale).toHaveBeenCalledWith(IMAGE_SCALE, IMAGE_SCALE);
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

    await expect(renderTimelineImages(days)).rejects.toThrow(message);
  });
});
