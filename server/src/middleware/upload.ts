import {
  MAX_BACKUP_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_BYTES,
} from '@tripdeck/shared';
import multer from 'multer';

/**
 * Multer instance using memory storage so magic-byte validation can happen
 * before anything touches the filesystem, capped at `MAX_IMAGE_UPLOAD_BYTES`.
 * MIME type and magic-byte validation are performed by saveImageToDisk
 * (storage/imageFiles) after the file is received, so the controller can
 * return a structured 400 response.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_UPLOAD_BYTES },
});

/**
 * Multer instance for backup zip uploads. Zips can bundle many trips' worth
 * of images, so this allows a much larger payload than a single image
 * upload; still memory-backed since this is a single-user local app.
 */
export const backupUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BACKUP_UPLOAD_BYTES },
});
