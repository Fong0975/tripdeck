import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeAttraction, makeDay } from '@/test-utils/fixtures';

import { loadTiles } from './loadTiles';
import { MAP_WIDTH } from './mapProjection';
import { renderDayMapImage } from './renderDayMapImage';

vi.mock('./loadTiles', () => ({ loadTiles: vi.fn() }));

function makeContext() {
  return {
    scale: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
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

const located = makeDay({
  attractions: [
    makeAttraction({ id: 1, latitude: 25.0, longitude: 121.5 }),
    makeAttraction({ id: 2, latitude: 25.1, longitude: 121.6 }),
  ],
});

beforeEach(() => {
  vi.mocked(loadTiles).mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('renderDayMapImage', () => {
  it('downloads the tiles covering the day and draws them', async () => {
    const context = makeContext();
    stubCanvas(context, new ArrayBuffer(1));
    const tile = {
      image: {} as HTMLImageElement,
      dx: 0,
      dy: 0,
    };
    vi.mocked(loadTiles).mockResolvedValue([tile]);

    await renderDayMapImage(located);

    const requested = vi.mocked(loadTiles).mock.calls[0][0];
    expect(requested.length).toBeGreaterThan(0);
    expect(requested[0].url).toMatch(
      /^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/,
    );
    expect(context.drawImage).toHaveBeenCalledTimes(1);
  });

  it('does not download tiles when the day has no locatable attraction', async () => {
    stubCanvas(makeContext(), new ArrayBuffer(1));

    await renderDayMapImage(makeDay());

    expect(loadTiles).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'the day has no attractions', day: makeDay() },
    {
      name: 'no attraction has coordinates',
      day: makeDay({ attractions: [makeAttraction({ id: 1 })] }),
    },
  ])('returns null when $name', async ({ day }) => {
    stubCanvas(makeContext(), new ArrayBuffer(1));

    await expect(renderDayMapImage(day)).resolves.toBeNull();
  });

  it('renders a PNG at the document content width', async () => {
    const png = new ArrayBuffer(8);
    stubCanvas(makeContext(), png);

    const view = await renderDayMapImage(located);

    expect(view?.data).toBe(png);
    expect(view?.width).toBe(MAP_WIDTH);
    expect(view?.height).toBeGreaterThan(0);
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

    await expect(renderDayMapImage(located)).rejects.toThrow(message);
  });
});
