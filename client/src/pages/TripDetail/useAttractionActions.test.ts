import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Attraction, Trip, TripContent } from '@/types';
import {
  addAttraction,
  deleteAttraction,
  duplicateAttraction,
  updateAttraction,
  uploadAttractionImage,
} from '@/utils/storage';

import { useAttractionActions } from './useAttractionActions';

vi.mock('@/utils/storage', () => ({
  addAttraction: vi.fn(),
  deleteAttraction: vi.fn(),
  duplicateAttraction: vi.fn(),
  updateAttraction: vi.fn(),
  uploadAttractionImage: vi.fn(),
}));

function makeTrip(): Trip {
  return {
    id: 1,
    title: 'Trip',
    destination: null,
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    createdAt: '2026-01-01',
  };
}

function makeContent(): TripContent {
  return {
    tripId: 1,
    days: [
      {
        id: 10,
        day: 1,
        date: '2026-01-01',
        locations: [],
        attractions: [],
        connections: [],
      },
    ],
  };
}

function makeAttraction(overrides: Partial<Attraction> = {}): Attraction {
  return { id: 0, name: 'Attraction', ...overrides };
}

describe('useAttractionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleSaveAttraction', () => {
    it.each([
      { description: 'trip is null', trip: null, content: makeContent() },
      { description: 'content is null', trip: makeTrip(), content: null },
    ])('does nothing when $description', async ({ trip, content }) => {
      const reloadContent = vi.fn();
      const closeModal = vi.fn();
      const { handleSaveAttraction } = useAttractionActions(
        trip,
        content,
        reloadContent,
        closeModal,
      );

      await handleSaveAttraction(0, makeAttraction());

      expect(addAttraction).not.toHaveBeenCalled();
      expect(updateAttraction).not.toHaveBeenCalled();
      expect(reloadContent).not.toHaveBeenCalled();
      expect(closeModal).not.toHaveBeenCalled();
    });

    describe.each([
      {
        description: 'creating a new attraction (id === 0)',
        attraction: makeAttraction({ id: 0, name: 'New Spot' }),
      },
      {
        description: 'updating an existing attraction',
        attraction: makeAttraction({ id: 5, name: 'Existing Spot' }),
      },
    ])('$description', ({ attraction }) => {
      it('calls the matching API, reloads, and closes the modal', async () => {
        vi.mocked(addAttraction).mockResolvedValue({ ...attraction, id: 99 });
        const reloadContent = vi.fn();
        const closeModal = vi.fn();
        const { handleSaveAttraction } = useAttractionActions(
          makeTrip(),
          makeContent(),
          reloadContent,
          closeModal,
        );

        await handleSaveAttraction(0, attraction);

        if (attraction.id === 0) {
          expect(addAttraction).toHaveBeenCalledWith(1, 10, {
            name: attraction.name,
            googleMapUrl: undefined,
            notes: undefined,
            nearbyAttractions: undefined,
            startTime: undefined,
            endTime: undefined,
            referenceWebsites: undefined,
          });
          expect(updateAttraction).not.toHaveBeenCalled();
        } else {
          expect(updateAttraction).toHaveBeenCalledWith(1, attraction.id, {
            name: attraction.name,
            googleMapUrl: null,
            notes: null,
            nearbyAttractions: null,
            startTime: null,
            endTime: null,
            referenceWebsites: undefined,
          });
          expect(addAttraction).not.toHaveBeenCalled();
        }
        expect(reloadContent).toHaveBeenCalledTimes(1);
        expect(closeModal).toHaveBeenCalledTimes(1);
      });
    });

    it('uploads each staged image after creating a new attraction', async () => {
      vi.mocked(addAttraction).mockResolvedValue(
        makeAttraction({ id: 99, name: 'New Spot' }),
      );
      const { handleSaveAttraction } = useAttractionActions(
        makeTrip(),
        makeContent(),
        vi.fn(),
        vi.fn(),
      );
      const file1 = new File(['a'], 'a.jpg');
      const file2 = new File(['b'], 'b.jpg');

      await handleSaveAttraction(0, makeAttraction({ id: 0 }), [
        { file: file1, title: 'First' },
        { file: file2, title: 'Second' },
      ]);

      expect(uploadAttractionImage).toHaveBeenNthCalledWith(
        1,
        1,
        99,
        file1,
        'First',
      );
      expect(uploadAttractionImage).toHaveBeenNthCalledWith(
        2,
        1,
        99,
        file2,
        'Second',
      );
    });

    it('does not upload images when updating an existing attraction', async () => {
      const { handleSaveAttraction } = useAttractionActions(
        makeTrip(),
        makeContent(),
        vi.fn(),
        vi.fn(),
      );

      await handleSaveAttraction(0, makeAttraction({ id: 5 }), [
        { file: new File(['a'], 'a.jpg'), title: 'Ignored' },
      ]);

      expect(uploadAttractionImage).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteAttraction', () => {
    it('does nothing when trip is null', async () => {
      const reloadContent = vi.fn();
      const { handleDeleteAttraction } = useAttractionActions(
        null,
        makeContent(),
        reloadContent,
        vi.fn(),
      );

      await handleDeleteAttraction(0, 5);

      expect(deleteAttraction).not.toHaveBeenCalled();
      expect(reloadContent).not.toHaveBeenCalled();
    });

    it('deletes the attraction and reloads', async () => {
      const reloadContent = vi.fn();
      const { handleDeleteAttraction } = useAttractionActions(
        makeTrip(),
        makeContent(),
        reloadContent,
        vi.fn(),
      );

      await handleDeleteAttraction(0, 5);

      expect(deleteAttraction).toHaveBeenCalledWith(1, 5);
      expect(reloadContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleDuplicateAttraction', () => {
    it('does nothing when trip is null', async () => {
      const reloadContent = vi.fn();
      const { handleDuplicateAttraction } = useAttractionActions(
        null,
        makeContent(),
        reloadContent,
        vi.fn(),
      );

      await handleDuplicateAttraction(0, makeAttraction({ id: 5 }));

      expect(duplicateAttraction).not.toHaveBeenCalled();
      expect(reloadContent).not.toHaveBeenCalled();
    });

    it('duplicates the attraction and reloads', async () => {
      const reloadContent = vi.fn();
      const { handleDuplicateAttraction } = useAttractionActions(
        makeTrip(),
        makeContent(),
        reloadContent,
        vi.fn(),
      );

      await handleDuplicateAttraction(0, makeAttraction({ id: 5 }));

      expect(duplicateAttraction).toHaveBeenCalledWith(1, 5);
      expect(reloadContent).toHaveBeenCalledTimes(1);
    });
  });
});
