import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api, json } from './client';
import {
  addOccasion,
  addTripCategory,
  addTripItem,
  addTripItemSpec,
  deleteOccasion,
  deleteTripCategory,
  deleteTripItem,
  deleteTripItemSpec,
  getTripChecklist,
  setCheck,
  updateOccasion,
  updateTripCategory,
  updateTripItem,
  updateTripItemSpec,
} from './tripChecklist';

vi.mock('./client', async importOriginal => {
  const actual = await importOriginal<typeof import('./client')>();
  return { ...actual, api: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api).mockResolvedValue(undefined);
});

describe('getTripChecklist', () => {
  it('GETs the trip checklist endpoint with no init', async () => {
    await getTripChecklist(1);

    expect(api).toHaveBeenCalledWith('/api/trips/1/checklist/');
  });
});

describe('trip checklist mutations', () => {
  it.each([
    {
      description: 'addTripCategory POSTs to the categories endpoint',
      call: () => addTripCategory(1, 'Camping'),
      expectedUrl: '/api/trips/1/checklist/categories',
      expectedInit: { method: 'POST', ...json({ name: 'Camping' }) },
    },
    {
      description: 'updateTripCategory PUTs to the category endpoint',
      call: () => updateTripCategory(1, 2, 'Renamed'),
      expectedUrl: '/api/trips/1/checklist/categories/2',
      expectedInit: { method: 'PUT', ...json({ name: 'Renamed' }) },
    },
    {
      description: 'deleteTripCategory DELETEs the category endpoint',
      call: () => deleteTripCategory(1, 2),
      expectedUrl: '/api/trips/1/checklist/categories/2',
      expectedInit: { method: 'DELETE' },
    },
    {
      description: 'addTripItem POSTs to the items endpoint',
      call: () => addTripItem(1, 2, { name: 'Tent' }),
      expectedUrl: '/api/trips/1/checklist/categories/2/items',
      expectedInit: { method: 'POST', ...json({ name: 'Tent' }) },
    },
    {
      description: 'updateTripItem PUTs to the item endpoint',
      call: () => updateTripItem(1, 3, { name: 'Renamed' }),
      expectedUrl: '/api/trips/1/checklist/items/3',
      expectedInit: { method: 'PUT', ...json({ name: 'Renamed' }) },
    },
    {
      description: 'deleteTripItem DELETEs the item endpoint',
      call: () => deleteTripItem(1, 3),
      expectedUrl: '/api/trips/1/checklist/items/3',
      expectedInit: { method: 'DELETE' },
    },
    {
      description: 'addTripItemSpec POSTs to the specs endpoint',
      call: () => addTripItemSpec(1, 3, { name: 'Size M' }),
      expectedUrl: '/api/trips/1/checklist/items/3/specs',
      expectedInit: { method: 'POST', ...json({ name: 'Size M' }) },
    },
    {
      description: 'updateTripItemSpec PUTs to the spec endpoint',
      call: () => updateTripItemSpec(1, 3, 4, { name: 'Size L' }),
      expectedUrl: '/api/trips/1/checklist/items/3/specs/4',
      expectedInit: { method: 'PUT', ...json({ name: 'Size L' }) },
    },
    {
      description: 'deleteTripItemSpec DELETEs the spec endpoint',
      call: () => deleteTripItemSpec(1, 3, 4),
      expectedUrl: '/api/trips/1/checklist/items/3/specs/4',
      expectedInit: { method: 'DELETE' },
    },
    {
      description: 'addOccasion POSTs to the occasions endpoint',
      call: () => addOccasion(1, 'Day 1'),
      expectedUrl: '/api/trips/1/checklist/occasions',
      expectedInit: { method: 'POST', ...json({ name: 'Day 1' }) },
    },
    {
      description: 'updateOccasion PUTs to the occasion endpoint',
      call: () => updateOccasion(1, 5, 'Renamed'),
      expectedUrl: '/api/trips/1/checklist/occasions/5',
      expectedInit: { method: 'PUT', ...json({ name: 'Renamed' }) },
    },
    {
      description: 'deleteOccasion DELETEs the occasion endpoint',
      call: () => deleteOccasion(1, 5),
      expectedUrl: '/api/trips/1/checklist/occasions/5',
      expectedInit: { method: 'DELETE' },
    },
    {
      description: 'setCheck PUTs to the item check endpoint',
      call: () => setCheck(1, 5, 3, true),
      expectedUrl: '/api/trips/1/checklist/occasions/5/items/3/check',
      expectedInit: { method: 'PUT', ...json({ checked: true }) },
    },
  ])('$description', async ({ call, expectedUrl, expectedInit }) => {
    await call();

    expect(api).toHaveBeenCalledWith(expectedUrl, expectedInit);
  });
});
