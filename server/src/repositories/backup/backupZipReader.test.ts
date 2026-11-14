import AdmZip from 'adm-zip';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../logger', async () => {
  const { mockLogger } = await import('../../test-utils/loggerMock');
  return { createLogger: () => mockLogger };
});

import { mockLogger } from '../../test-utils/loggerMock';

import { openBackupZip, readEntryData, readJsonEntry } from './backupZipReader';
import { BackupValidationError } from './errors';

function zipWith(entries: Record<string, string>): AdmZip {
  const zip = new AdmZip();
  for (const [entryPath, content] of Object.entries(entries)) {
    zip.addFile(entryPath, Buffer.from(content, 'utf-8'));
  }
  return zip;
}

describe('backupZipReader', () => {
  describe('openBackupZip', () => {
    it('opens a valid zip buffer', () => {
      const buffer = zipWith({ 'manifest.json': '{}' }).toBuffer();

      const zip = openBackupZip(buffer);

      expect(zip.getEntry('manifest.json')).not.toBeNull();
    });

    it('rejects a buffer that is not a zip archive', () => {
      expect(() => openBackupZip(Buffer.from('not a zip'))).toThrow(
        new BackupValidationError(
          'Invalid backup file: not a valid zip archive',
        ),
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Rejected backup upload: not a valid zip archive',
        expect.objectContaining({ bufferSize: 9 }),
      );
    });
  });

  describe('readJsonEntry', () => {
    it.each([
      {
        name: 'parses a JSON object entry',
        entries: { 'a.json': '{"x":1}' },
        expected: { x: 1 },
        warns: false,
      },
      {
        name: 'parses a JSON primitive entry',
        entries: { 'a.json': '42' },
        expected: 42,
        warns: false,
      },
      {
        name: 'returns undefined for a missing entry',
        entries: {},
        expected: undefined,
        warns: false,
      },
      {
        name: 'returns undefined and warns for malformed JSON',
        entries: { 'a.json': '{not json' },
        expected: undefined,
        warns: true,
      },
    ])('$name', ({ entries, expected, warns }) => {
      expect(readJsonEntry(zipWith(entries), 'a.json')).toEqual(expected);
      if (warns) {
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Failed to parse JSON entry in backup zip',
          expect.objectContaining({ entryPath: 'a.json' }),
        );
      } else {
        expect(mockLogger.warn).not.toHaveBeenCalled();
      }
    });
  });

  describe('readEntryData', () => {
    it.each([
      {
        name: 'returns the bytes of an existing entry',
        entries: { 'img.jpg': 'bytes' },
        expected: Buffer.from('bytes', 'utf-8'),
      },
      {
        name: 'returns undefined for a missing entry',
        entries: {},
        expected: undefined,
      },
    ])('$name', ({ entries, expected }) => {
      expect(readEntryData(zipWith(entries), 'img.jpg')).toEqual(expected);
    });
  });
});
