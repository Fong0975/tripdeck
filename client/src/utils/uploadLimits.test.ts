import {
  MAX_BACKUP_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_BYTES,
} from '@tripdeck/shared';
import { describe, expect, it } from 'vitest';

import {
  ACCEPTED_IMAGE_TYPES,
  validateBackupFile,
  validateImageFile,
} from './uploadLimits';

/** Builds a file of the given type whose `size` reports `size` bytes. */
function makeFile(type: string, size: number): File {
  const file = new File([''], 'file', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('ACCEPTED_IMAGE_TYPES', () => {
  it('lists every accepted image MIME type', () => {
    expect(ACCEPTED_IMAGE_TYPES).toBe(
      'image/jpeg,image/png,image/gif,image/webp',
    );
  });
});

describe('validateImageFile', () => {
  it.each([
    {
      description: 'a small JPEG',
      file: makeFile('image/jpeg', 1024),
      expected: null,
    },
    {
      description: 'a WebP exactly at the size limit',
      file: makeFile('image/webp', MAX_IMAGE_UPLOAD_BYTES),
      expected: null,
    },
    {
      description: 'a PNG over the size limit',
      file: makeFile('image/png', MAX_IMAGE_UPLOAD_BYTES + 1),
      expected: '圖片大小不可超過 10 MB',
    },
    {
      description: 'an unsupported image type',
      file: makeFile('image/svg+xml', 1024),
      expected: '僅支援 JPEG、PNG、GIF、WEBP 格式的圖片',
    },
    {
      description: 'a file with no type',
      file: makeFile('', 1024),
      expected: '僅支援 JPEG、PNG、GIF、WEBP 格式的圖片',
    },
  ])('returns $expected for $description', ({ file, expected }) => {
    expect(validateImageFile(file)).toBe(expected);
  });
});

describe('validateBackupFile', () => {
  it.each([
    {
      description: 'a backup exactly at the size limit',
      file: makeFile('application/zip', MAX_BACKUP_UPLOAD_BYTES),
      expected: null,
    },
    {
      description: 'a backup over the size limit',
      file: makeFile('application/zip', MAX_BACKUP_UPLOAD_BYTES + 1),
      expected: '備份檔大小不可超過 300 MB',
    },
  ])('returns $expected for $description', ({ file, expected }) => {
    expect(validateBackupFile(file)).toBe(expected);
  });
});
