/** A rendered PNG picture ready to embed in the document. */
export interface RenderedPicture {
  /** PNG bytes. */
  data: ArrayBuffer;
  /** Size in the document, in docx pixels. */
  width: number;
  height: number;
}

/** Font families that cover Traditional Chinese on common platforms. */
const FONT_STACK = `'Microsoft JhengHei', 'PingFang TC', 'Noto Sans TC', sans-serif`;

/**
 * Builds a canvas font shorthand using the export font stack.
 *
 * @param size - Font size in logical pixels.
 * @param weight - Font weight.
 */
export function canvasFont(
  size: number,
  weight: 'normal' | 'bold' = 'normal',
): string {
  return `${weight} ${size}px ${FONT_STACK}`;
}

/**
 * Shortens text with an ellipsis so it fits a pixel width.
 *
 * @param ctx - The context whose current font is used to measure.
 * @param text - The text to fit.
 * @param maxWidth - Available width in logical pixels.
 */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let end = text.length;
  while (
    end > 0 &&
    ctx.measureText(`${text.slice(0, end)}…`).width > maxWidth
  ) {
    end -= 1;
  }
  return end > 0 ? `${text.slice(0, end)}…` : '…';
}

/** Fills a rounded rectangle with the current fill style. */
export function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

/** Outlines a rounded rectangle with the current stroke style. */
export function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.stroke();
}

/**
 * Draws onto an offscreen canvas and encodes it as PNG.
 *
 * @param width - Logical width of the drawing surface.
 * @param height - Logical height of the drawing surface.
 * @param scale - Canvas pixels per logical pixel, for a sharp image when zoomed.
 * @param draw - Draws in logical pixels; the scale is already applied.
 * @returns The PNG bytes.
 * @throws {Error} when the canvas cannot provide a 2D context or encode a PNG.
 */
export async function renderCanvasToPng(
  width: number,
  height: number,
  scale: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): Promise<ArrayBuffer> {
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  ctx.scale(scale, scale);
  draw(ctx);

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) {
    throw new Error('PNG encoding failed');
  }
  return blob.arrayBuffer();
}
