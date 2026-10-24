import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addAttraction,
  deleteAttraction,
  duplicateAttraction,
  reorderAttractions,
  updateAttraction,
} from './attractions';
import {
  addTemplateCategory,
  addTemplateItem,
  addTemplateItemSpec,
  deleteTemplateCategory,
  deleteTemplateItem,
  deleteTemplateItemSpec,
  getChecklistTemplate,
  updateTemplateCategory,
  updateTemplateItem,
  updateTemplateItemSpec,
} from './checklistTemplate';
import { api, json } from './client';
import {
  addConnection,
  deleteConnection,
  updateConnection,
} from './connections';
import {
  addDayLocation,
  deleteDayLocation,
  updateDayLocation,
} from './dayLocations';
import { updateDayNotes } from './dayNotes';
import {
  deleteAttractionImage,
  deleteConnectionImage,
  deleteDayImage,
  deleteTripImage,
  uploadAttractionImage,
  uploadConnectionImage,
  uploadDayImage,
  uploadTripImage,
} from './images';
import { getMapsStatus, reportMapsError, resolveTripGeo } from './maps';
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
import {
  createTrip,
  deleteTrip,
  getTrip,
  getTripContent,
  getTrips,
  updateTrip,
} from './trips';
import { getWeather, getWeatherStatus } from './weather';

vi.mock('./client');

// `clearMocks` keeps implementations, so a per-test rejection would otherwise
// leak into later tests.
beforeEach(() => {
  vi.mocked(api).mockResolvedValue(undefined);
});

// Each endpoint module is a thin wrapper over `api`, so these tables only
// check the request each exported function builds against that boundary.
// The individual CRUD payload branches (?? undefined vs ?? null) live in the
// action-hook tests (e.g. useAttractionActions.test.ts).

/** One endpoint call and the exact `api` arguments it must produce. */
interface EndpointCase {
  name: string;
  call: () => Promise<unknown>;
  url: string;
  /** Omitted for GETs, which must call `api` with the URL alone. */
  init?: RequestInit;
}

/** Registers one test per case asserting the `api` call it produces. */
function itCallsApi(cases: EndpointCase[]) {
  it.each(cases)('$name', async ({ call, url, init }) => {
    await call();

    const args: [string, RequestInit?] = init ? [url, init] : [url];
    expect(api).toHaveBeenCalledWith(...args);
  });
}

const tripData = {
  title: 'Trip',
  startDate: '2026-01-01',
  endDate: '2026-01-05',
};
const tripUpdate = { title: 'Renamed Trip', endDate: '2026-01-10' };

describe('attractions API', () => {
  itCallsApi([
    {
      name: 'addAttraction POSTs to the day-scoped endpoint',
      call: () => addAttraction(1, 10, { name: 'Spot' }),
      url: '/api/trips/1/days/10/attractions',
      init: { method: 'POST', ...json({ name: 'Spot' }) },
    },
    {
      name: 'updateAttraction PUTs to the attraction endpoint',
      call: () =>
        updateAttraction(1, 5, { name: 'Renamed', googleMapUrl: null }),
      url: '/api/trips/1/attractions/5',
      init: {
        method: 'PUT',
        ...json({ name: 'Renamed', googleMapUrl: null }),
      },
    },
    {
      name: 'deleteAttraction DELETEs the attraction endpoint',
      call: () => deleteAttraction(1, 5),
      url: '/api/trips/1/attractions/5',
      init: { method: 'DELETE' },
    },
    {
      name: 'duplicateAttraction POSTs to the duplicate endpoint',
      call: () => duplicateAttraction(1, 5),
      url: '/api/trips/1/attractions/5/duplicate',
      init: { method: 'POST' },
    },
    {
      name: 'reorderAttractions PATCHes the order endpoint',
      call: () => reorderAttractions(1, 10, [3, 1, 2]),
      url: '/api/trips/1/days/10/attractions/order',
      init: { method: 'PATCH', ...json({ orderedIds: [3, 1, 2] }) },
    },
  ]);
});

describe('checklist template API', () => {
  itCallsApi([
    {
      name: 'getChecklistTemplate GETs the template endpoint with no init',
      call: () => getChecklistTemplate(),
      url: '/api/checklist-template/',
    },
    {
      name: 'addTemplateCategory POSTs to the categories endpoint',
      call: () => addTemplateCategory('Camping'),
      url: '/api/checklist-template/categories',
      init: { method: 'POST', ...json({ name: 'Camping' }) },
    },
    {
      name: 'updateTemplateCategory PUTs to the category endpoint',
      call: () => updateTemplateCategory(1, 'Renamed'),
      url: '/api/checklist-template/categories/1',
      init: { method: 'PUT', ...json({ name: 'Renamed' }) },
    },
    {
      name: 'deleteTemplateCategory DELETEs the category endpoint',
      call: () => deleteTemplateCategory(1),
      url: '/api/checklist-template/categories/1',
      init: { method: 'DELETE' },
    },
    {
      name: 'addTemplateItem POSTs to the items endpoint',
      call: () => addTemplateItem(1, { name: 'Tent' }),
      url: '/api/checklist-template/categories/1/items',
      init: { method: 'POST', ...json({ name: 'Tent' }) },
    },
    {
      name: 'updateTemplateItem PUTs to the item endpoint',
      call: () => updateTemplateItem(1, 2, { name: 'Renamed', quantity: 3 }),
      url: '/api/checklist-template/categories/1/items/2',
      init: { method: 'PUT', ...json({ name: 'Renamed', quantity: 3 }) },
    },
    {
      name: 'deleteTemplateItem DELETEs the item endpoint',
      call: () => deleteTemplateItem(1, 2),
      url: '/api/checklist-template/categories/1/items/2',
      init: { method: 'DELETE' },
    },
    {
      name: 'addTemplateItemSpec POSTs to the specs endpoint',
      call: () => addTemplateItemSpec(1, 2, { name: 'Size M' }),
      url: '/api/checklist-template/categories/1/items/2/specs',
      init: { method: 'POST', ...json({ name: 'Size M' }) },
    },
    {
      name: 'updateTemplateItemSpec PUTs to the spec endpoint',
      call: () => updateTemplateItemSpec(1, 2, 3, { name: 'Size L' }),
      url: '/api/checklist-template/categories/1/items/2/specs/3',
      init: { method: 'PUT', ...json({ name: 'Size L' }) },
    },
    {
      name: 'deleteTemplateItemSpec DELETEs the spec endpoint',
      call: () => deleteTemplateItemSpec(1, 2, 3),
      url: '/api/checklist-template/categories/1/items/2/specs/3',
      init: { method: 'DELETE' },
    },
  ]);
});

describe('connections API', () => {
  itCallsApi([
    {
      name: 'addConnection POSTs to the day-scoped endpoint',
      call: () =>
        addConnection(1, 10, {
          fromAttractionId: 100,
          toAttractionId: 200,
          transportMode: 'transit',
        }),
      url: '/api/trips/1/days/10/connections',
      init: {
        method: 'POST',
        ...json({
          fromAttractionId: 100,
          toAttractionId: 200,
          transportMode: 'transit',
        }),
      },
    },
    {
      name: 'updateConnection PUTs to the connection endpoint',
      call: () => updateConnection(1, 7, { transportMode: 'walk' }),
      url: '/api/trips/1/connections/7',
      init: { method: 'PUT', ...json({ transportMode: 'walk' }) },
    },
    {
      name: 'deleteConnection DELETEs the connection endpoint',
      call: () => deleteConnection(1, 7),
      url: '/api/trips/1/connections/7',
      init: { method: 'DELETE' },
    },
  ]);
});

describe('dayLocations API', () => {
  itCallsApi([
    {
      name: 'addDayLocation POSTs to the day-scoped endpoint',
      call: () => addDayLocation(1, 10, 'Airport'),
      url: '/api/trips/1/days/10/locations',
      init: { method: 'POST', ...json({ name: 'Airport' }) },
    },
    {
      name: 'updateDayLocation PUTs to the location endpoint',
      call: () => updateDayLocation(1, 5, 'Renamed'),
      url: '/api/trips/1/locations/5',
      init: { method: 'PUT', ...json({ name: 'Renamed' }) },
    },
    {
      name: 'deleteDayLocation DELETEs the location endpoint',
      call: () => deleteDayLocation(1, 5),
      url: '/api/trips/1/locations/5',
      init: { method: 'DELETE' },
    },
  ]);
});

describe('dayNotes API', () => {
  itCallsApi([
    {
      name: 'updateDayNotes PUTs the notes to the day-scoped endpoint',
      call: () => updateDayNotes(1, 10, 'New notes'),
      url: '/api/trips/1/days/10/notes',
      init: { method: 'PUT', ...json({ notes: 'New notes' }) },
    },
    {
      name: 'updateDayNotes PUTs null to clear the notes',
      call: () => updateDayNotes(1, 10, null),
      url: '/api/trips/1/days/10/notes',
      init: { method: 'PUT', ...json({ notes: null }) },
    },
  ]);
});

describe('images API', () => {
  itCallsApi([
    {
      name: 'deleteAttractionImage DELETEs the attraction image endpoint',
      call: () => deleteAttractionImage(1, 5, 9),
      url: '/api/trips/1/attractions/5/images/9',
      init: { method: 'DELETE' },
    },
    {
      name: 'deleteConnectionImage DELETEs the connection image endpoint',
      call: () => deleteConnectionImage(1, 7, 9),
      url: '/api/trips/1/connections/7/images/9',
      init: { method: 'DELETE' },
    },
    {
      name: 'deleteTripImage DELETEs the trip image endpoint',
      call: () => deleteTripImage(1, 9),
      url: '/api/trips/1/images/9',
      init: { method: 'DELETE' },
    },
    {
      name: 'deleteDayImage DELETEs the day image endpoint',
      call: () => deleteDayImage(1, 10, 9),
      url: '/api/trips/1/days/10/images/9',
      init: { method: 'DELETE' },
    },
  ]);

  it.each([
    {
      name: 'uploadAttractionImage',
      call: (file: File) => uploadAttractionImage(1, 5, file, 'My title'),
      url: '/api/trips/1/attractions/5/images',
      title: 'My title',
    },
    {
      name: 'uploadConnectionImage',
      call: (file: File) =>
        uploadConnectionImage(1, 7, file, 'Connection title'),
      url: '/api/trips/1/connections/7/images',
      title: 'Connection title',
    },
    {
      name: 'uploadTripImage',
      call: (file: File) => uploadTripImage(1, file, 'Trip title'),
      url: '/api/trips/1/images',
      title: 'Trip title',
    },
    {
      name: 'uploadDayImage',
      call: (file: File) => uploadDayImage(1, 10, file, 'Day title'),
      url: '/api/trips/1/days/10/images',
      title: 'Day title',
    },
  ])(
    '$name POSTs a multipart form containing the image and title',
    async ({ call, url, title }) => {
      const file = new File(['a'], 'a.jpg');

      await call(file);

      expect(api).toHaveBeenCalledWith(
        url,
        expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
      );
      const [, init] = vi.mocked(api).mock.calls[0];
      expect(Object.fromEntries((init?.body as FormData).entries())).toEqual({
        image: file,
        title,
      });
    },
  );
});

describe('trip checklist API', () => {
  itCallsApi([
    {
      name: 'getTripChecklist GETs the trip checklist endpoint with no init',
      call: () => getTripChecklist(1),
      url: '/api/trips/1/checklist/',
    },
    {
      name: 'addTripCategory POSTs to the categories endpoint',
      call: () => addTripCategory(1, 'Camping'),
      url: '/api/trips/1/checklist/categories',
      init: { method: 'POST', ...json({ name: 'Camping' }) },
    },
    {
      name: 'updateTripCategory PUTs to the category endpoint',
      call: () => updateTripCategory(1, 2, 'Renamed'),
      url: '/api/trips/1/checklist/categories/2',
      init: { method: 'PUT', ...json({ name: 'Renamed' }) },
    },
    {
      name: 'deleteTripCategory DELETEs the category endpoint',
      call: () => deleteTripCategory(1, 2),
      url: '/api/trips/1/checklist/categories/2',
      init: { method: 'DELETE' },
    },
    {
      name: 'addTripItem POSTs to the items endpoint',
      call: () => addTripItem(1, 2, { name: 'Tent' }),
      url: '/api/trips/1/checklist/categories/2/items',
      init: { method: 'POST', ...json({ name: 'Tent' }) },
    },
    {
      name: 'updateTripItem PUTs to the item endpoint',
      call: () => updateTripItem(1, 3, { name: 'Renamed' }),
      url: '/api/trips/1/checklist/items/3',
      init: { method: 'PUT', ...json({ name: 'Renamed' }) },
    },
    {
      name: 'deleteTripItem DELETEs the item endpoint',
      call: () => deleteTripItem(1, 3),
      url: '/api/trips/1/checklist/items/3',
      init: { method: 'DELETE' },
    },
    {
      name: 'addTripItemSpec POSTs to the specs endpoint',
      call: () => addTripItemSpec(1, 3, { name: 'Size M' }),
      url: '/api/trips/1/checklist/items/3/specs',
      init: { method: 'POST', ...json({ name: 'Size M' }) },
    },
    {
      name: 'updateTripItemSpec PUTs to the spec endpoint',
      call: () => updateTripItemSpec(1, 3, 4, { name: 'Size L' }),
      url: '/api/trips/1/checklist/items/3/specs/4',
      init: { method: 'PUT', ...json({ name: 'Size L' }) },
    },
    {
      name: 'deleteTripItemSpec DELETEs the spec endpoint',
      call: () => deleteTripItemSpec(1, 3, 4),
      url: '/api/trips/1/checklist/items/3/specs/4',
      init: { method: 'DELETE' },
    },
    {
      name: 'addOccasion POSTs to the occasions endpoint',
      call: () => addOccasion(1, 'Day 1'),
      url: '/api/trips/1/checklist/occasions',
      init: { method: 'POST', ...json({ name: 'Day 1' }) },
    },
    {
      name: 'updateOccasion PUTs to the occasion endpoint',
      call: () => updateOccasion(1, 5, 'Renamed'),
      url: '/api/trips/1/checklist/occasions/5',
      init: { method: 'PUT', ...json({ name: 'Renamed' }) },
    },
    {
      name: 'deleteOccasion DELETEs the occasion endpoint',
      call: () => deleteOccasion(1, 5),
      url: '/api/trips/1/checklist/occasions/5',
      init: { method: 'DELETE' },
    },
    {
      name: 'setCheck PUTs to the item check endpoint',
      call: () => setCheck(1, 5, 3, true),
      url: '/api/trips/1/checklist/occasions/5/items/3/check',
      init: { method: 'PUT', ...json({ checked: true }) },
    },
  ]);
});

describe('trips API', () => {
  itCallsApi([
    {
      name: 'getTrips GETs the trips list endpoint',
      call: () => getTrips(),
      url: '/api/trips/',
    },
    {
      name: 'createTrip POSTs the trip payload to the trips endpoint',
      call: () => createTrip(tripData),
      url: '/api/trips/',
      init: { method: 'POST', ...json(tripData) },
    },
    {
      name: 'updateTrip PUTs the partial trip payload to the trip endpoint',
      call: () => updateTrip(1, tripUpdate),
      url: '/api/trips/1',
      init: { method: 'PUT', ...json(tripUpdate) },
    },
    {
      name: 'deleteTrip DELETEs the trip endpoint',
      call: () => deleteTrip(1),
      url: '/api/trips/1',
      init: { method: 'DELETE' },
    },
  ]);

  it.each([
    {
      name: 'getTrip returns the trip',
      call: () => getTrip(1),
      resolved: { id: 1, title: 'Trip' },
      url: '/api/trips/1',
    },
    {
      name: 'getTripContent returns the content',
      call: () => getTripContent(1),
      resolved: { tripId: 1, days: [] },
      url: '/api/trips/1/content',
    },
  ])('$name when the request succeeds', async ({ call, resolved, url }) => {
    vi.mocked(api).mockResolvedValue(resolved);

    expect(await call()).toEqual(resolved);
    expect(api).toHaveBeenCalledWith(url);
  });
});

describe('trips API failure handling', () => {
  it.each([
    {
      name: 'getTrip',
      call: () => getTrip(1),
      error: new Error('API error 404: /api/trips/1'),
    },
    {
      name: 'getTripContent',
      call: () => getTripContent(1),
      error: new Error('API error 404'),
    },
  ])('$name returns null when the request fails', async ({ call, error }) => {
    vi.mocked(api).mockRejectedValue(error);

    expect(await call()).toBeNull();
  });
});

describe('weather API', () => {
  itCallsApi([
    {
      name: 'getWeatherStatus GETs the weather status endpoint',
      call: () => getWeatherStatus(),
      url: '/api/weather/status',
    },
    {
      name: 'getWeather GETs the weather endpoint with a plain name encoded in the query',
      call: () => getWeather('Tokyo', '2026-08-20', 3),
      url: '/api/weather?location=Tokyo&date=2026-08-20&days=3',
    },
    {
      name: 'getWeather GETs the weather endpoint with a non-ASCII name and negative days encoded in the query',
      call: () => getWeather('東京 駅', '2026-08-20', -1),
      url: '/api/weather?location=%E6%9D%B1%E4%BA%AC+%E9%A7%85&date=2026-08-20&days=-1',
    },
  ]);
});

describe('maps API', () => {
  itCallsApi([
    {
      name: 'getMapsStatus GETs the maps status endpoint',
      call: () => getMapsStatus(),
      url: '/api/maps/status',
    },
    {
      name: 'resolveTripGeo POSTs the trip and day ids to the resolve endpoint',
      call: () => resolveTripGeo(1, 2),
      url: '/api/maps/resolve',
      init: { method: 'POST', ...json({ tripId: 1, dayId: 2 }) },
    },
    {
      name: 'reportMapsError POSTs an auth failure report',
      call: () => reportMapsError(),
      url: '/api/maps/report-error',
      init: { method: 'POST', ...json({ reason: 'auth_failure' }) },
    },
  ]);
});
