import { ImageRun, Paragraph, TextRun } from 'docx';

import { imageUrl } from '@/api/images';
import type { AttractionImage } from '@/types';

import { CONTENT_WIDTH_PX, FONT, HALF_WIDTH_PX } from './constants';

/** Raster formats `docx`'s ImageRun can embed directly. */
type DocxImageType = 'jpg' | 'png' | 'gif' | 'bmp';

/** Every format the fetch step recognises, including ones needing special handling. */
type FetchedImageType = DocxImageType | 'svg' | 'webp';

/**
 * Infers an image's format from its content type, falling back to the URL's
 * extension, and finally to JPEG.
 */
function sniffImageType(contentType: string, url: string): FetchedImageType {
  const lower = url.toLowerCase();
  const matches = (token: string) =>
    contentType.includes(token) || lower.endsWith(`.${token}`);

  if (matches('png')) {
    return 'png';
  }
  if (matches('gif')) {
    return 'gif';
  }
  if (matches('bmp')) {
    return 'bmp';
  }
  if (matches('svg')) {
    return 'svg';
  }
  if (matches('webp')) {
    return 'webp';
  }
  return 'jpg';
}

async function fetchImageData(
  url: string,
): Promise<{ buffer: ArrayBuffer; imageType: FetchedImageType }> {
  const absoluteUrl = url.startsWith('/')
    ? `${window.location.origin}${url}`
    : url;

  const response = await fetch(absoluteUrl);
  if (!response.ok) {
    throw new Error(`Image fetch failed: ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') ?? '';
  return { buffer, imageType: sniffImageType(contentType, url) };
}

/** Decodes image bytes into a loaded `<img>` element. */
async function decodeImage(
  buffer: ArrayBuffer,
  imageType: FetchedImageType,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: `image/${imageType}` });
    const objUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve(img);
      URL.revokeObjectURL(objUrl);
    };
    img.onerror = err => {
      URL.revokeObjectURL(objUrl);
      reject(err);
    };
    img.src = objUrl;
  });
}

/**
 * Re-encodes a decoded image as PNG bytes via a canvas.
 *
 * @throws {Error} when the canvas cannot provide a 2D context or encode the image.
 */
async function rasterizeToPng(img: HTMLImageElement): Promise<ArrayBuffer> {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) {
    throw new Error('PNG encoding failed');
  }
  return blob.arrayBuffer();
}

/**
 * Returns bytes and a type that `docx` can embed. WebP is not among the
 * ImageRun formats (jpg/png/gif/bmp), and embedding the raw bytes under
 * another type yields a broken picture in Word, so it is converted to PNG.
 */
async function toDocxImageData(
  buffer: ArrayBuffer,
  imageType: DocxImageType | 'webp',
  decoded: HTMLImageElement,
): Promise<{ data: ArrayBuffer; type: DocxImageType }> {
  if (imageType === 'webp') {
    return { data: await rasterizeToPng(decoded), type: 'png' };
  }
  return { data: buffer, type: imageType };
}

function calcImageDimensions(
  naturalWidth: number,
  naturalHeight: number,
): { width: number; height: number } {
  const targetWidth = Math.min(
    Math.max(naturalWidth, HALF_WIDTH_PX),
    CONTENT_WIDTH_PX,
  );
  const targetHeight = Math.round((targetWidth / naturalWidth) * naturalHeight);
  return { width: targetWidth, height: targetHeight };
}

/**
 * Fetches an attraction/connection image and renders it as docx Paragraphs
 * (image + optional caption). Falls back to an inline error note if the
 * image can't be fetched or decoded.
 */
export async function makeImageParagraphs(
  img: AttractionImage,
): Promise<Paragraph[]> {
  const url = imageUrl(img.filename);
  try {
    const { buffer, imageType } = await fetchImageData(url);
    if (imageType === 'svg') {
      return [];
    }

    const decoded = await decodeImage(buffer, imageType);
    const { width, height } = calcImageDimensions(
      decoded.naturalWidth,
      decoded.naturalHeight,
    );
    const { data, type } = await toDocxImageData(buffer, imageType, decoded);

    const paragraphs: Paragraph[] = [
      new Paragraph({
        children: [
          new ImageRun({
            data,
            transformation: { width, height },
            type,
          }),
        ],
        spacing: { before: 60, after: 40 },
      }),
    ];

    if (img.title) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: img.title,
              italics: true,
              color: '777777',
              size: 18,
              font: FONT,
            }),
          ],
          spacing: { before: 0, after: 60 },
        }),
      );
    }

    return paragraphs;
  } catch {
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: `[圖片無法載入${img.title ? `: ${img.title}` : ''}]`,
            color: 'AA0000',
            font: FONT,
          }),
        ],
      }),
    ];
  }
}
