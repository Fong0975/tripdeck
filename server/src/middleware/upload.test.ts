import fs from 'fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs', () => ({
  default: {
    writeFileSync: vi.fn(),
    copyFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
}));
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'fixed-uuid'),
}));

import {
  copyImageFile,
  deleteImageFromDisk,
  saveImageToDisk,
  saveImportedImageBuffer,
} from './upload';

const GARBAGE_BUFFER = Buffer.from(new Array(20).fill(0x00));

interface MimeCase {
  mime: string;
  ext: string;
  validBuffer: Buffer;
}

const mimeCases: MimeCase[] = [
  {
    mime: 'image/jpeg',
    ext: '.jpg',
    validBuffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
  },
  {
    mime: 'image/png',
    ext: '.png',
    validBuffer: Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
    ]),
  },
  {
    mime: 'image/gif',
    ext: '.gif',
    validBuffer: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
  },
  {
    mime: 'image/webp',
    ext: '.webp',
    validBuffer: Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      0x00, 0x00, 0x00, 0x00,
    ]),
  },
];

describe('saveImageToDisk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.each(mimeCases)('$mime', ({ mime, ext, validBuffer }) => {
    it(`returns a filename ending in ${ext} and writes the buffer to disk when magic bytes are valid`, () => {
      const filename = saveImageToDisk(validBuffer, mime);

      expect(filename.endsWith(ext)).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(filename),
        validBuffer,
      );
    });

    it('throws and does not write to disk when magic bytes do not match the declared mimetype', () => {
      expect(() => saveImageToDisk(GARBAGE_BUFFER, mime)).toThrow(
        'File content does not match declared image type',
      );
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('webp-specific signature checks', () => {
    it('throws when the RIFF header is correct but the WEBP marker at offset 8 is wrong', () => {
      const wrongMarker = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]);

      expect(() => saveImageToDisk(wrongMarker, 'image/webp')).toThrow(
        'File content does not match declared image type',
      );
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('throws when the buffer is too short to contain the WEBP marker, even with a RIFF prefix', () => {
      const tooShort = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      ]);

      expect(() => saveImageToDisk(tooShort, 'image/webp')).toThrow(
        'File content does not match declared image type',
      );
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });
});

describe('copyImageFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('copies the file to a new UUID-based filename with the same extension', () => {
    const result = copyImageFile('original.jpg');

    expect(result).toBe('fixed-uuid.jpg');
    expect(result).not.toBe('original.jpg');
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      expect.stringContaining('original.jpg'),
      expect.stringContaining('fixed-uuid.jpg'),
    );
  });

  it('returns null when fs.copyFileSync throws', () => {
    vi.mocked(fs.copyFileSync).mockImplementationOnce(() => {
      throw new Error('ENOENT');
    });

    const result = copyImageFile('original.jpg');

    expect(result).toBeNull();
  });
});

describe('saveImportedImageBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['.jpg', '.png', '.gif', '.webp'])(
    'writes the buffer to disk under a new UUID filename for %s',
    ext => {
      const buffer = Buffer.from('image-bytes');

      const filename = saveImportedImageBuffer(buffer, `original${ext}`);

      expect(filename).toBe(`fixed-uuid${ext}`);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(filename),
        buffer,
      );
    },
  );

  it('is case-insensitive about the source extension', () => {
    const filename = saveImportedImageBuffer(
      Buffer.from('image-bytes'),
      'ORIGINAL.JPG',
    );

    expect(filename).toBe('fixed-uuid.jpg');
  });

  it('throws and does not write to disk for an unsupported extension', () => {
    expect(() =>
      saveImportedImageBuffer(Buffer.from('bytes'), 'malware.exe'),
    ).toThrow('Unsupported image extension: .exe');
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});

describe('deleteImageFromDisk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the file from disk without throwing', () => {
    expect(() => deleteImageFromDisk('to-delete.jpg')).not.toThrow();
    expect(fs.unlinkSync).toHaveBeenCalledWith(
      expect.stringContaining('to-delete.jpg'),
    );
  });

  it('silently swallows the error when fs.unlinkSync throws', () => {
    vi.mocked(fs.unlinkSync).mockImplementationOnce(() => {
      throw new Error('ENOENT');
    });

    let result: void | undefined;
    expect(() => {
      result = deleteImageFromDisk('missing.jpg');
    }).not.toThrow();
    expect(result).toBeUndefined();
  });
});
