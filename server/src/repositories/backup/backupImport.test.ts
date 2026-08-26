import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockImportSingleTrip = vi.fn();
vi.mock('./tripImport', () => ({
  importSingleTrip: (...args: unknown[]) => mockImportSingleTrip(...args),
}));

const mockRestoreTemplate = vi.fn();
vi.mock('./templateRestore', () => ({
  restoreTemplate: (...args: unknown[]) => mockRestoreTemplate(...args),
}));

const mockParseBackupZip = vi.fn();
vi.mock('./backupValidate', () => ({
  parseBackupZip: (...args: unknown[]) => mockParseBackupZip(...args),
}));

import type { TripBackupData } from '../../types/backup';

import { importBackupZip } from './backupImport';
import type { ParsedBackup } from './backupValidate';

beforeEach(() => {
  vi.clearAllMocks();
});

const sampleData: TripBackupData = {
  trip: {
    id: 1,
    title: 'Kyoto Trip',
    destination: 'Kyoto',
    startDate: '2024-05-10',
    endDate: '2024-05-11',
    description: null,
    images: [],
  },
  content: { tripId: 1, days: [] },
  checklist: null,
};

function makeParsedBackup(overrides: Partial<ParsedBackup> = {}): ParsedBackup {
  return {
    manifest: {
      formatVersion: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      tripCount: 0,
      trips: [],
    },
    trips: [],
    template: null,
    ...overrides,
  };
}

describe('importBackupZip', () => {
  it('imports every trip parsed from the backup', async () => {
    const parsed = makeParsedBackup({
      trips: [
        {
          originalTripId: 1,
          folder: 'trip_1',
          data: sampleData,
          imageBuffers: new Map(),
        },
      ],
    });
    mockParseBackupZip.mockReturnValue(parsed);
    mockImportSingleTrip.mockResolvedValue({
      originalTripId: 1,
      newTripId: 1000,
      title: 'Kyoto Trip',
    });

    const result = await importBackupZip(Buffer.from('zip'));

    expect(mockImportSingleTrip).toHaveBeenCalledWith(
      sampleData,
      parsed.trips[0].imageBuffers,
    );
    expect(result.imported).toEqual([
      { originalTripId: 1, newTripId: 1000, title: 'Kyoto Trip' },
    ]);
    expect(result.failed).toEqual([]);
    expect(result.templateRestored).toBe(false);
  });

  it('collects a failed entry without aborting the rest when one trip fails', async () => {
    const tripA: TripBackupData = {
      ...sampleData,
      trip: { ...sampleData.trip, id: 1, title: 'Trip A' },
    };
    const tripB: TripBackupData = {
      ...sampleData,
      trip: { ...sampleData.trip, id: 2, title: 'Trip B' },
    };
    const parsed = makeParsedBackup({
      trips: [
        {
          originalTripId: 1,
          folder: 'trip_1',
          data: tripA,
          imageBuffers: new Map(),
        },
        {
          originalTripId: 2,
          folder: 'trip_2',
          data: tripB,
          imageBuffers: new Map(),
        },
      ],
    });
    mockParseBackupZip.mockReturnValue(parsed);
    mockImportSingleTrip.mockImplementation((data: TripBackupData) => {
      if (data.trip.id === 1) {
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve({
        originalTripId: data.trip.id,
        newTripId: 1000,
        title: data.trip.title,
      });
    });

    const result = await importBackupZip(Buffer.from('zip'));

    expect(result.failed).toEqual([
      { originalTripId: 1, title: 'Trip A', error: 'boom' },
    ]);
    expect(result.imported).toEqual([
      { originalTripId: 2, newTripId: 1000, title: 'Trip B' },
    ]);
  });

  it('reports a generic message when importSingleTrip throws a non-Error value', async () => {
    const parsed = makeParsedBackup({
      trips: [
        {
          originalTripId: 1,
          folder: 'trip_1',
          data: sampleData,
          imageBuffers: new Map(),
        },
      ],
    });
    mockParseBackupZip.mockReturnValue(parsed);
    mockImportSingleTrip.mockRejectedValue('weird failure');

    const result = await importBackupZip(Buffer.from('zip'));

    expect(result.failed).toEqual([
      {
        originalTripId: 1,
        title: 'Kyoto Trip',
        error: 'Unknown import error',
      },
    ]);
  });

  it('restores the template when restoreTemplate is true and the backup includes one', async () => {
    const template = { categories: [] };
    const parsed = makeParsedBackup({ template });
    mockParseBackupZip.mockReturnValue(parsed);

    const result = await importBackupZip(Buffer.from('zip'), {
      restoreTemplate: true,
    });

    expect(mockRestoreTemplate).toHaveBeenCalledWith(template);
    expect(result.templateRestored).toBe(true);
  });

  it('does not restore the template when restoreTemplate is not requested', async () => {
    const parsed = makeParsedBackup({ template: { categories: [] } });
    mockParseBackupZip.mockReturnValue(parsed);

    const result = await importBackupZip(Buffer.from('zip'));

    expect(mockRestoreTemplate).not.toHaveBeenCalled();
    expect(result.templateRestored).toBe(false);
  });

  it('does not restore the template when requested but the backup has none', async () => {
    const parsed = makeParsedBackup({ template: null });
    mockParseBackupZip.mockReturnValue(parsed);

    const result = await importBackupZip(Buffer.from('zip'), {
      restoreTemplate: true,
    });

    expect(mockRestoreTemplate).not.toHaveBeenCalled();
    expect(result.templateRestored).toBe(false);
  });

  it('leaves already-successful trip results intact when template restore fails', async () => {
    const parsed = makeParsedBackup({
      trips: [
        {
          originalTripId: 1,
          folder: 'trip_1',
          data: sampleData,
          imageBuffers: new Map(),
        },
      ],
      template: { categories: [] },
    });
    mockParseBackupZip.mockReturnValue(parsed);
    mockImportSingleTrip.mockResolvedValue({
      originalTripId: 1,
      newTripId: 1000,
      title: 'Kyoto Trip',
    });
    mockRestoreTemplate.mockRejectedValue(new Error('template db error'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await importBackupZip(Buffer.from('zip'), {
      restoreTemplate: true,
    });

    expect(result.imported).toEqual([
      { originalTripId: 1, newTripId: 1000, title: 'Kyoto Trip' },
    ]);
    expect(result.failed).toEqual([]);
    expect(result.templateRestored).toBe(false);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
