import AdmZip from 'adm-zip';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ChecklistTemplateResponse,
  TripChecklistResponse,
} from '../../types/checklist';
import type { TripContentResponse, TripResponse } from '../../types/trip';

import { buildBackupZip, buildTripBackupData } from './backupExport';
import { TripNotFoundError } from './errors';

const mockFindById = vi.fn();
const mockFindContent = vi.fn();
const mockFindChecklist = vi.fn();
const mockFindTemplate = vi.fn();
const mockReadFileSync = vi.fn();

vi.mock('../trip', () => ({
  findById: (...args: unknown[]) => mockFindById(...args),
  findContent: (...args: unknown[]) => mockFindContent(...args),
}));

vi.mock('../checklist/template', () => ({
  findTemplate: (...args: unknown[]) => mockFindTemplate(...args),
}));

vi.mock('../checklist/trip', () => ({
  findChecklist: (...args: unknown[]) => mockFindChecklist(...args),
}));

vi.mock('../../middleware/upload', () => ({ UPLOADS_DIR: '/uploads' }));

vi.mock('fs', () => ({
  default: {
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  },
}));

const sampleTrip: TripResponse = {
  id: 1,
  title: '東京 🗼 五日遊',
  destination: 'Tokyo',
  startDate: '2024-05-10',
  endDate: '2024-05-12',
  description: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  images: [{ id: 1, filename: 'trip1.jpg', title: '封面' }],
};

const sampleContent: TripContentResponse = {
  tripId: 1,
  days: [
    {
      id: 10,
      day: 1,
      date: '2024-05-10',
      notes: null,
      locations: [],
      attractions: [
        {
          id: 100,
          name: 'Attraction',
          googleMapUrl: null,
          notes: null,
          nearbyAttractions: null,
          startTime: null,
          endTime: null,
          referenceWebsites: [],
          images: [{ id: 2, filename: 'attr1.jpg', title: 'a' }],
          sortOrder: 0,
        },
      ],
      connections: [
        {
          id: 200,
          fromAttractionId: 100,
          toAttractionId: 100,
          transportMode: 'walk',
          duration: null,
          route: null,
          notes: null,
          images: [{ id: 3, filename: 'conn1.jpg', title: 'c' }],
        },
      ],
      images: [{ id: 4, filename: 'day1.jpg', title: 'd' }],
    },
  ],
};

const sampleChecklist: TripChecklistResponse = {
  tripId: 1,
  categories: [],
  occasions: [],
};

const sampleTemplate: ChecklistTemplateResponse = {
  categories: [
    {
      id: 1,
      name: 'Documents',
      items: [
        {
          id: 1,
          name: 'Passport',
          quantity: 1,
          notes: null,
          storage_location: null,
          specs: [],
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockReadFileSync.mockReturnValue(Buffer.from('fake-image-bytes'));
  mockFindTemplate.mockResolvedValue(sampleTemplate);
});

describe('buildTripBackupData', () => {
  it('throws TripNotFoundError when the trip does not exist', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(buildTripBackupData(999)).rejects.toThrow(TripNotFoundError);
    expect(mockFindContent).not.toHaveBeenCalled();
    expect(mockFindChecklist).not.toHaveBeenCalled();
  });

  it('assembles trip, content, and checklist into one payload', async () => {
    mockFindById.mockResolvedValue(sampleTrip);
    mockFindContent.mockResolvedValue(sampleContent);
    mockFindChecklist.mockResolvedValue(sampleChecklist);

    const data = await buildTripBackupData(1);

    expect(data).toEqual({
      trip: {
        id: 1,
        title: '東京 🗼 五日遊',
        destination: 'Tokyo',
        startDate: '2024-05-10',
        endDate: '2024-05-12',
        description: null,
        images: sampleTrip.images,
      },
      content: sampleContent,
      checklist: sampleChecklist,
    });
  });

  it('leaves checklist null when the trip has none initialized', async () => {
    mockFindById.mockResolvedValue(sampleTrip);
    mockFindContent.mockResolvedValue(sampleContent);
    mockFindChecklist.mockResolvedValue(null);

    const data = await buildTripBackupData(1);

    expect(data.checklist).toBeNull();
  });

  it('falls back to an empty day list if content lookup unexpectedly returns null', async () => {
    mockFindById.mockResolvedValue(sampleTrip);
    mockFindContent.mockResolvedValue(null);
    mockFindChecklist.mockResolvedValue(null);

    const data = await buildTripBackupData(1);

    expect(data.content).toEqual({ tripId: 1, days: [] });
  });
});

describe('buildBackupZip', () => {
  beforeEach(() => {
    mockFindById.mockResolvedValue(sampleTrip);
    mockFindContent.mockResolvedValue(sampleContent);
    mockFindChecklist.mockResolvedValue(sampleChecklist);
  });

  it('writes a manifest and one folder per trip with data.json and images', async () => {
    const buffer = await buildBackupZip([1]);
    const zip = new AdmZip(buffer);

    const manifest = JSON.parse(zip.readAsText('manifest.json'));
    expect(manifest).toEqual({
      formatVersion: 1,
      exportedAt: expect.any(String),
      tripCount: 1,
      trips: [{ originalTripId: 1, folder: 'trip_1', title: '東京 🗼 五日遊' }],
    });

    const data = JSON.parse(zip.readAsText('trips/trip_1/data.json'));
    expect(data.trip.title).toBe('東京 🗼 五日遊');
    expect(data.trip.images[0].title).toBe('封面');

    for (const filename of [
      'trip1.jpg',
      'attr1.jpg',
      'conn1.jpg',
      'day1.jpg',
    ]) {
      const entry = zip.getEntry(`trips/trip_1/images/${filename}`);
      expect(entry).not.toBeNull();
      expect(entry?.getData().toString()).toBe('fake-image-bytes');
    }
  });

  it('does not lose emoji/CJK characters through the zip round-trip', async () => {
    const buffer = await buildBackupZip([1]);
    const zip = new AdmZip(buffer);
    const data = JSON.parse(zip.readAsText('trips/trip_1/data.json'));

    expect(data.trip.title).toBe(sampleTrip.title);
  });

  it('de-duplicates repeated trip IDs', async () => {
    const buffer = await buildBackupZip([1, 1]);
    const zip = new AdmZip(buffer);
    const manifest = JSON.parse(zip.readAsText('manifest.json'));

    expect(manifest.tripCount).toBe(1);
    expect(mockFindById).toHaveBeenCalledTimes(1);
  });

  it('skips an image that is missing on disk instead of failing the export', async () => {
    mockReadFileSync.mockImplementation((filePath: string) => {
      if (filePath.includes('attr1.jpg')) {
        throw new Error('ENOENT');
      }
      return Buffer.from('fake-image-bytes');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const buffer = await buildBackupZip([1]);
    const zip = new AdmZip(buffer);

    expect(zip.getEntry('trips/trip_1/images/attr1.jpg')).toBeNull();
    expect(zip.getEntry('trips/trip_1/images/day1.jpg')).not.toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('attr1.jpg'));

    warnSpy.mockRestore();
  });

  it('serializes a null checklist as null in data.json', async () => {
    mockFindChecklist.mockResolvedValue(null);

    const buffer = await buildBackupZip([1]);
    const zip = new AdmZip(buffer);
    const data = JSON.parse(zip.readAsText('trips/trip_1/data.json'));

    expect(data.checklist).toBeNull();
  });

  it('propagates TripNotFoundError for a nonexistent trip', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(buildBackupZip([999])).rejects.toThrow(TripNotFoundError);
  });

  it('omits template.json and includesTemplate by default', async () => {
    const buffer = await buildBackupZip([1]);
    const zip = new AdmZip(buffer);
    const manifest = JSON.parse(zip.readAsText('manifest.json'));

    expect(zip.getEntry('template.json')).toBeNull();
    expect(manifest.includesTemplate).toBeUndefined();
    expect(mockFindTemplate).not.toHaveBeenCalled();
  });

  it('adds template.json and sets includesTemplate when requested', async () => {
    const buffer = await buildBackupZip([1], { includeTemplate: true });
    const zip = new AdmZip(buffer);
    const manifest = JSON.parse(zip.readAsText('manifest.json'));

    expect(manifest.includesTemplate).toBe(true);
    const template = JSON.parse(zip.readAsText('template.json'));
    expect(template).toEqual(sampleTemplate);
  });

  it('can export just the template with no trips', async () => {
    const buffer = await buildBackupZip([], { includeTemplate: true });
    const zip = new AdmZip(buffer);
    const manifest = JSON.parse(zip.readAsText('manifest.json'));

    expect(manifest.tripCount).toBe(0);
    expect(manifest.includesTemplate).toBe(true);
    expect(zip.getEntry('template.json')).not.toBeNull();
  });

  it('still produces a valid backup when the template has no categories yet', async () => {
    mockFindTemplate.mockResolvedValue({ categories: [] });

    const buffer = await buildBackupZip([1], { includeTemplate: true });
    const zip = new AdmZip(buffer);
    const template = JSON.parse(zip.readAsText('template.json'));

    expect(template).toEqual({ categories: [] });
  });
});
