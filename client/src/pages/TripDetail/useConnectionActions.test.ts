import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TravelConnection, Trip, TripContent } from '@/types';
import {
  addConnection,
  deleteConnection,
  updateConnection,
  uploadConnectionImage,
} from '@/utils/storage';

import { useConnectionActions } from './useConnectionActions';

vi.mock('@/utils/storage', () => ({
  addConnection: vi.fn(),
  deleteConnection: vi.fn(),
  updateConnection: vi.fn(),
  uploadConnectionImage: vi.fn(),
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

function makeConnection(
  overrides: Partial<TravelConnection> = {},
): TravelConnection {
  return {
    id: 0,
    fromAttractionId: 100,
    toAttractionId: 200,
    transportMode: 'transit',
    ...overrides,
  };
}

describe('useConnectionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleAddConnection', () => {
    it('builds a pending connection and opens the connection modal', () => {
      const openConnectionModal = vi.fn();
      const { handleAddConnection } = useConnectionActions(
        makeTrip(),
        makeContent(),
        vi.fn(),
        vi.fn(),
        openConnectionModal,
      );

      handleAddConnection(0, 100, 200);

      expect(openConnectionModal).toHaveBeenCalledWith(0, {
        id: 0,
        fromAttractionId: 100,
        toAttractionId: 200,
        transportMode: 'transit',
      });
    });
  });

  describe('handleSaveConnection', () => {
    it.each([
      { description: 'trip is null', trip: null, content: makeContent() },
      { description: 'content is null', trip: makeTrip(), content: null },
    ])('does nothing when $description', async ({ trip, content }) => {
      const reloadContent = vi.fn();
      const closeModal = vi.fn();
      const { handleSaveConnection } = useConnectionActions(
        trip,
        content,
        reloadContent,
        closeModal,
        vi.fn(),
      );

      await handleSaveConnection(0, makeConnection());

      expect(addConnection).not.toHaveBeenCalled();
      expect(updateConnection).not.toHaveBeenCalled();
      expect(reloadContent).not.toHaveBeenCalled();
      expect(closeModal).not.toHaveBeenCalled();
    });

    describe.each([
      {
        description: 'creating a new connection (id === 0)',
        connection: makeConnection({ id: 0 }),
      },
      {
        description: 'updating an existing connection',
        connection: makeConnection({ id: 7 }),
      },
    ])('$description', ({ connection }) => {
      it('calls the matching API, reloads, and closes the modal', async () => {
        const reloadContent = vi.fn();
        const closeModal = vi.fn();
        const { handleSaveConnection } = useConnectionActions(
          makeTrip(),
          makeContent(),
          reloadContent,
          closeModal,
          vi.fn(),
        );

        await handleSaveConnection(0, connection);

        if (connection.id === 0) {
          expect(addConnection).toHaveBeenCalledWith(1, 10, {
            fromAttractionId: connection.fromAttractionId,
            toAttractionId: connection.toAttractionId,
            transportMode: connection.transportMode,
            duration: undefined,
            route: undefined,
            notes: undefined,
          });
          expect(updateConnection).not.toHaveBeenCalled();
        } else {
          expect(updateConnection).toHaveBeenCalledWith(1, connection.id, {
            transportMode: connection.transportMode,
            duration: null,
            route: null,
            notes: null,
          });
          expect(addConnection).not.toHaveBeenCalled();
        }
        expect(reloadContent).toHaveBeenCalledTimes(1);
        expect(closeModal).toHaveBeenCalledTimes(1);
      });
    });

    it('uploads each staged image after creating a new connection', async () => {
      vi.mocked(addConnection).mockResolvedValue(makeConnection({ id: 99 }));
      const { handleSaveConnection } = useConnectionActions(
        makeTrip(),
        makeContent(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
      );
      const file1 = new File(['a'], 'a.jpg');
      const file2 = new File(['b'], 'b.jpg');

      await handleSaveConnection(0, makeConnection({ id: 0 }), [
        { file: file1, title: 'First' },
        { file: file2, title: 'Second' },
      ]);

      expect(uploadConnectionImage).toHaveBeenNthCalledWith(
        1,
        1,
        99,
        file1,
        'First',
      );
      expect(uploadConnectionImage).toHaveBeenNthCalledWith(
        2,
        1,
        99,
        file2,
        'Second',
      );
    });

    it('does not upload images when updating an existing connection', async () => {
      const { handleSaveConnection } = useConnectionActions(
        makeTrip(),
        makeContent(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
      );

      await handleSaveConnection(0, makeConnection({ id: 7 }), [
        { file: new File(['a'], 'a.jpg'), title: 'Ignored' },
      ]);

      expect(uploadConnectionImage).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteConnection', () => {
    it('does nothing when trip is null', async () => {
      const reloadContent = vi.fn();
      const { handleDeleteConnection } = useConnectionActions(
        null,
        makeContent(),
        reloadContent,
        vi.fn(),
        vi.fn(),
      );

      await handleDeleteConnection(0, 5);

      expect(deleteConnection).not.toHaveBeenCalled();
      expect(reloadContent).not.toHaveBeenCalled();
    });

    it('deletes the connection and reloads', async () => {
      const reloadContent = vi.fn();
      const { handleDeleteConnection } = useConnectionActions(
        makeTrip(),
        makeContent(),
        reloadContent,
        vi.fn(),
        vi.fn(),
      );

      await handleDeleteConnection(0, 5);

      expect(deleteConnection).toHaveBeenCalledWith(1, 5);
      expect(reloadContent).toHaveBeenCalledTimes(1);
    });
  });
});
