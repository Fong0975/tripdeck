import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api, json } from './client';
import {
  createTrip,
  deleteTrip,
  getTrip,
  getTripContent,
  getTrips,
} from './trips';

vi.mock('./client', async importOriginal => {
  const actual = await importOriginal<typeof import('./client')>();
  return { ...actual, api: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getTrips', () => {
  it('GETs the trips list endpoint', async () => {
    vi.mocked(api).mockResolvedValue([]);

    await getTrips();

    expect(api).toHaveBeenCalledWith('/api/trips/');
  });
});

describe('getTrip', () => {
  it('returns the trip when the request succeeds', async () => {
    const trip = { id: 1, title: 'Trip' };
    vi.mocked(api).mockResolvedValue(trip);

    expect(await getTrip(1)).toEqual(trip);
    expect(api).toHaveBeenCalledWith('/api/trips/1');
  });

  it('returns null when the request fails', async () => {
    vi.mocked(api).mockRejectedValue(new Error('API error 404: /api/trips/1'));

    expect(await getTrip(1)).toBeNull();
  });
});

describe('createTrip', () => {
  it('POSTs the trip payload to the trips endpoint', async () => {
    const data = {
      title: 'Trip',
      startDate: '2026-01-01',
      endDate: '2026-01-05',
    };
    vi.mocked(api).mockResolvedValue({ id: 1, ...data });

    await createTrip(data);

    expect(api).toHaveBeenCalledWith('/api/trips/', {
      method: 'POST',
      ...json(data),
    });
  });
});

describe('deleteTrip', () => {
  it('DELETEs the trip endpoint', async () => {
    vi.mocked(api).mockResolvedValue(undefined);

    await deleteTrip(1);

    expect(api).toHaveBeenCalledWith('/api/trips/1', { method: 'DELETE' });
  });
});

describe('getTripContent', () => {
  it('returns the content when the request succeeds', async () => {
    const content = { tripId: 1, days: [] };
    vi.mocked(api).mockResolvedValue(content);

    expect(await getTripContent(1)).toEqual(content);
    expect(api).toHaveBeenCalledWith('/api/trips/1/content');
  });

  it('returns null when the request fails', async () => {
    vi.mocked(api).mockRejectedValue(new Error('API error 404'));

    expect(await getTripContent(1)).toBeNull();
  });
});
