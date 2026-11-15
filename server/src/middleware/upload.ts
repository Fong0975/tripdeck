import multer from 'multer';

/**
 * Multer instance using memory storage so magic-byte validation can happen
 * before anything touches the filesystem. Max file size: 10 MB.
 * MIME type and magic-byte validation are performed by saveImageToDisk
 * (storage/imageFiles) after the file is received, so the controller can
 * return a structured 400 response.
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
