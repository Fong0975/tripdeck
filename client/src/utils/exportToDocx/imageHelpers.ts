import { ImageRun, Paragraph, TextRun } from 'docx';

import type { AttractionImage } from '@/types';

import { CONTENT_WIDTH_PX, FONT, HALF_WIDTH_PX } from './constants';

type SupportedImageType = 'jpg' | 'png' | 'gif' | 'bmp' | 'svg';

async function fetchImageData(
  url: string,
): Promise<{ buffer: ArrayBuffer; imageType: SupportedImageType }> {
  const absoluteUrl = url.startsWith('/')
    ? `${window.location.origin}${url}`
    : url;

  const response = await fetch(absoluteUrl);
  if (!response.ok) {
    throw new Error(`Image fetch failed: ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') ?? '';
  const lower = url.toLowerCase();

  let imageType: SupportedImageType = 'jpg';
  if (contentType.includes('png') || lower.endsWith('.png')) {
    imageType = 'png';
  } else if (contentType.includes('gif') || lower.endsWith('.gif')) {
    imageType = 'gif';
  } else if (contentType.includes('bmp') || lower.endsWith('.bmp')) {
    imageType = 'bmp';
  } else if (contentType.includes('svg') || lower.endsWith('.svg')) {
    imageType = 'svg';
  }

  return { buffer, imageType };
}

async function getImageSize(
  buffer: ArrayBuffer,
  imageType: SupportedImageType,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: `image/${imageType}` });
    const objUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objUrl);
    };
    img.onerror = err => {
      URL.revokeObjectURL(objUrl);
      reject(err);
    };
    img.src = objUrl;
  });
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
  const url = `/uploads/${img.filename}`;
  try {
    const { buffer, imageType } = await fetchImageData(url);
    if (imageType === 'svg') {
      return [];
    }

    const { width: nw, height: nh } = await getImageSize(buffer, imageType);
    const { width, height } = calcImageDimensions(nw, nh);

    const paragraphs: Paragraph[] = [
      new Paragraph({
        children: [
          new ImageRun({
            data: buffer,
            transformation: { width, height },
            type: imageType,
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
