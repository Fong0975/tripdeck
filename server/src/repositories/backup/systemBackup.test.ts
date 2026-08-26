import AdmZip from 'adm-zip';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChecklistTemplateResponse } from '../../types/checklist';
import type { TripContentResponse, TripResponse } from '../../types/trip';

import { buildSystemBackupZip } from './systemBackup';

const mockFindAll = vi.fn();
const mockFindById = vi.fn();
const mockFindContent = vi.fn();
const mockFindChecklist = vi.fn();
const mockFindTemplate = vi.fn();
const mockReadFileSync = vi.fn();

vi.mock('../trip', () => ({
  findAll: (...args: unknown[]) => mockFindAll(...args),
  findById: (...args: unknown[]) => mockFindById(...args),
  findContent: (...args: unknown[]) => mockFindContent(...args),
}));

vi.mock('../checklist/trip', () => ({
  findChecklist: (...args: unknown[]) => mockFindChecklist(...args),
}));

vi.mock('../checklist/template', () => ({
  findTemplate: (...args: unknown[]) => mockFindTemplate(...args),
}));

vi.mock('../../middleware/upload', () => ({ UPLOADS_DIR: '/uploads' }));

vi.mock('fs', () => ({
  default: {
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  },
}));

const sampleTrips: TripResponse[] = [
  {
    id: 1,
    title: '東京 🗼 五日遊',
    destination: 'Tokyo',
    startDate: '2024-05-10',
    endDate: '2024-05-12',
    description: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    images: [],
  },
  {
    id: 2,
    title: '大阪二日遊',
    destination: 'Osaka',
    startDate: '2024-06-01',
    endDate: '2024-06-02',
    description: null,
    createdAt: '2024-02-01T00:00:00.000Z',
    images: [],
  },
];

const sampleContent: TripContentResponse = { tripId: 1, days: [] };

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
  mockFindAll.mockResolvedValue(sampleTrips);
  mockFindById.mockImplementation((id: number) =>
    Promise.resolve(sampleTrips.find(trip => trip.id === id) ?? null),
  );
  mockFindContent.mockResolvedValue(sampleContent);
  mockFindChecklist.mockResolvedValue(null);
  mockFindTemplate.mockResolvedValue(sampleTemplate);
  mockReadFileSync.mockReturnValue(Buffer.from('fake-image-bytes'));
});

describe('buildSystemBackupZip', () => {
  it('includes every trip and the checklist template, with includesTemplate set', async () => {
    const buffer = await buildSystemBackupZip();
    const zip = new AdmZip(buffer);

    const manifest = JSON.parse(zip.readAsText('manifest.json'));
    expect(manifest.includesTemplate).toBe(true);
    expect(manifest.tripCount).toBe(2);
    expect(manifest.trips).toEqual([
      { originalTripId: 1, folder: 'trip_1', title: '東京 🗼 五日遊' },
      { originalTripId: 2, folder: 'trip_2', title: '大阪二日遊' },
    ]);

    expect(zip.getEntry('trips/trip_1/data.json')).not.toBeNull();
    expect(zip.getEntry('trips/trip_2/data.json')).not.toBeNull();

    const template = JSON.parse(zip.readAsText('template.json'));
    expect(template).toEqual(sampleTemplate);
  });

  it('still produces a valid (empty) backup when there are no trips', async () => {
    mockFindAll.mockResolvedValue([]);

    const buffer = await buildSystemBackupZip();
    const zip = new AdmZip(buffer);
    const manifest = JSON.parse(zip.readAsText('manifest.json'));

    expect(manifest.tripCount).toBe(0);
    expect(manifest.trips).toEqual([]);
    expect(manifest.includesTemplate).toBe(true);
  });

  it('still produces a valid backup when the template has no categories yet', async () => {
    mockFindTemplate.mockResolvedValue({ categories: [] });

    const buffer = await buildSystemBackupZip();
    const zip = new AdmZip(buffer);
    const template = JSON.parse(zip.readAsText('template.json'));

    expect(template).toEqual({ categories: [] });
  });
});
