import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

import { IMAGE_MIME_TYPES, type ImageMimeType } from '@tripdeck/shared';

import { createLogger } from '../logger';

const logger = createLogger('upload');

/** Leading signature bytes of each accepted image type. */
const MAGIC_BYTES: Record<ImageMimeType, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

const MIME_TO_EXT: Record<ImageMimeType, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const EXT_TO_MIME: Record<string, ImageMimeType> = Object.fromEntries(
  IMAGE_MIME_TYPES.map(mime => [MIME_TO_EXT[mime], mime]),
);

/** Narrows a declared MIME type to one of the accepted image types. */
function isImageMimeType(value: string): value is ImageMimeType {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

/**
 * Validates the magic bytes of an image buffer against the signature of its
 * declared type. For WebP, additionally verifies the RIFF...WEBP marker at
 * offset 8.
 */
function hasValidMagicBytes(buffer: Buffer, mime: ImageMimeType): boolean {
  const bytes = MAGIC_BYTES[mime];
  if (buffer.length < bytes.length + (mime === 'image/webp' ? 12 : 0)) {
    return false;
  }

  for (let i = 0; i < bytes.length; i++) {
    if (buffer[i] !== bytes[i]) {
      return false;
    }
  }

  if (mime === 'image/webp') {
    const webpMarker = [0x57, 0x45, 0x42, 0x50];
    for (let i = 0; i < webpMarker.length; i++) {
      if (buffer[8 + i] !== webpMarker[i]) {
        return false;
      }
    }
  }

  return true;
}

/** Directory holding every uploaded image file, served at `/uploads`. */
export const UPLOADS_DIR = path.join(__dirname, '../../uploads');

/**
 * Writes a validated image buffer to disk using a UUID-based filename.
 * Returns the generated filename (with extension) for storage in the database.
 *
 * @throws {Error} When the declared MIME type is not an accepted image type
 *   or the magic bytes do not match it.
 */
export function saveImageToDisk(buffer: Buffer, mimetype: string): string {
  if (!isImageMimeType(mimetype) || !hasValidMagicBytes(buffer, mimetype)) {
    throw new Error('File content does not match declared image type');
  }

  const filename = `${randomUUID()}${MIME_TO_EXT[mimetype]}`;
  const dest = path.join(UPLOADS_DIR, filename);

  fs.writeFileSync(dest, buffer);
  return filename;
}

/**
 * Copies an existing image file to a new UUID-based filename.
 * Returns the new filename, or null if the source file is missing.
 */
export function copyImageFile(filename: string): string | null {
  const srcPath = path.join(UPLOADS_DIR, filename);
  const ext = path.extname(filename);
  const newFilename = `${randomUUID()}${ext}`;
  const destPath = path.join(UPLOADS_DIR, newFilename);
  try {
    fs.copyFileSync(srcPath, destPath);
    return newFilename;
  } catch (err) {
    logger.error('Failed to copy image file', { filename, newFilename }, err);
    return null;
  }
}

/**
 * Writes an image buffer restored from a backup zip to disk under a new
 * UUID-based filename, so it can never collide with an existing file.
 * A backup zip is just another user-supplied upload (nothing verifies it
 * was actually produced by this server), so its image bytes go through the
 * same magic-byte validation as a direct upload via saveImageToDisk —
 * trusting the declared filename's extension alone would let a crafted zip
 * smuggle arbitrary file content in under an image extension.
 *
 * @throws {Error} When the original filename's extension isn't a supported
 *   image type, or the buffer's content doesn't match that type.
 */
export function saveImportedImageBuffer(
  buffer: Buffer,
  originalFilename: string,
): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const mimetype = EXT_TO_MIME[ext];
  if (!mimetype) {
    throw new Error(`Unsupported image extension: ${ext}`);
  }
  if (!hasValidMagicBytes(buffer, mimetype)) {
    throw new Error('File content does not match declared image type');
  }

  const filename = `${randomUUID()}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return filename;
}

/**
 * Removes an uploaded image file from disk.
 * Silently ignores missing files; any other failure (e.g. a permission
 * error) is logged rather than swallowed, since that previously masked a
 * real deletion failure as a no-op success.
 */
export function deleteImageFromDisk(filename: string): void {
  const filePath = path.join(UPLOADS_DIR, filename);
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    logger.error('Failed to delete image file from disk', { filename }, err);
  }
}
