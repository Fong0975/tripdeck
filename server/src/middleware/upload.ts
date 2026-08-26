import fs from 'fs';
import path from 'path';

import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  {
    mime: 'image/png',
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
];

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

/**
 * Validates the magic bytes of an image buffer against known image signatures.
 * For WebP, additionally verifies the RIFF...WEBP marker at offset 8.
 */
function hasValidMagicBytes(buffer: Buffer, mime: string): boolean {
  const entry = MAGIC_BYTES.find(m => m.mime === mime);
  if (!entry) {
    return false;
  }

  const { bytes } = entry;
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

export const UPLOADS_DIR = path.join(__dirname, '../../uploads');

/**
 * Multer instance using memory storage so magic-byte validation can happen
 * before anything touches the filesystem. Max file size: 10 MB.
 * MIME type and magic-byte validation are performed in saveImageToDisk after
 * the file is received, so the controller can return a structured 400 response.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * Multer instance for backup zip uploads. Zips can bundle many trips' worth
 * of images, so this allows a much larger payload than a single image
 * upload; still memory-backed since this is a single-user local app.
 */
export const backupUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 * 1024 },
});

/**
 * Writes a validated image buffer to disk using a UUID-based filename.
 * Returns the generated filename (with extension) for storage in the database.
 *
 * @throws {Error} When magic bytes do not match the declared MIME type.
 */
export function saveImageToDisk(buffer: Buffer, mimetype: string): string {
  if (!hasValidMagicBytes(buffer, mimetype)) {
    throw new Error('File content does not match declared image type');
  }

  const ext = MIME_TO_EXT[mimetype] ?? '.jpg';
  const filename = `${uuidv4()}${ext}`;
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
  const newFilename = `${uuidv4()}${ext}`;
  const destPath = path.join(UPLOADS_DIR, newFilename);
  try {
    fs.copyFileSync(srcPath, destPath);
    return newFilename;
  } catch {
    return null;
  }
}

const IMPORT_EXTENSIONS = new Set(Object.values(MIME_TO_EXT));

/**
 * Writes an image buffer restored from a backup zip to disk under a new
 * UUID-based filename, so it can never collide with an existing file.
 * Trusts the original filename's extension rather than re-validating magic
 * bytes: unlike saveImageToDisk (which handles arbitrary user uploads),
 * this only ever receives files this server itself wrote during export.
 *
 * @throws {Error} When the original filename's extension isn't a supported image type.
 */
export function saveImportedImageBuffer(
  buffer: Buffer,
  originalFilename: string,
): string {
  const ext = path.extname(originalFilename).toLowerCase();
  if (!IMPORT_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported image extension: ${ext}`);
  }

  const filename = `${uuidv4()}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return filename;
}

/**
 * Removes an uploaded image file from disk.
 * Silently ignores missing files.
 */
export function deleteImageFromDisk(filename: string): void {
  const filePath = path.join(UPLOADS_DIR, filename);
  try {
    fs.unlinkSync(filePath);
  } catch {
    // File already removed or never written — safe to ignore
  }
}
