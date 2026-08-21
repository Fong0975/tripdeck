import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Trip, TripContent } from '@/types';
import {
  addDayLocation,
  deleteDayLocation,
  updateDayLocation,
} from '@/utils/storage';

import { useDayLocationActions } from './useDayLocationActions';

vi.mock('@/utils/storage', () => ({
  addDayLocation: vi.fn(),
  deleteDayLocation: vi.fn(),
  updateDayLocation: vi.fn(),
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

describe('useDayLocationActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleAddLocation', () => {
    it.each([
      { description: 'trip is null', trip: null, content: makeContent() },
      { description: 'content is null', trip: makeTrip(), content: null },
    ])('does nothing when $description', async ({ trip, content }) => {
      const reloadContent = vi.fn();
      const { handleAddLocation } = useDayLocationActions(
        trip,
        content,
        reloadContent,
      );

      await handleAddLocation(0, 'Airport');

      expect(addDayLocation).not.toHaveBeenCalled();
      expect(reloadContent).not.toHaveBeenCalled();
    });

    it('adds a location to the given day and reloads', async () => {
      const reloadContent = vi.fn();
      const { handleAddLocation } = useDayLocationActions(
        makeTrip(),
        makeContent(),
        reloadContent,
      );

      await handleAddLocation(0, 'Airport');

      expect(addDayLocation).toHaveBeenCalledWith(1, 10, 'Airport');
      expect(reloadContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleUpdateLocation', () => {
    it('does nothing when trip is null', async () => {
      const reloadContent = vi.fn();
      const { handleUpdateLocation } = useDayLocationActions(
        null,
        makeContent(),
        reloadContent,
      );

      await handleUpdateLocation(0, 5, 'Renamed');

      expect(updateDayLocation).not.toHaveBeenCalled();
      expect(reloadContent).not.toHaveBeenCalled();
    });

    it('updates the location name and reloads', async () => {
      const reloadContent = vi.fn();
      const { handleUpdateLocation } = useDayLocationActions(
        makeTrip(),
        makeContent(),
        reloadContent,
      );

      await handleUpdateLocation(0, 5, 'Renamed');

      expect(updateDayLocation).toHaveBeenCalledWith(1, 5, 'Renamed');
      expect(reloadContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleDeleteLocation', () => {
    it('does nothing when trip is null', async () => {
      const reloadContent = vi.fn();
      const { handleDeleteLocation } = useDayLocationActions(
        null,
        makeContent(),
        reloadContent,
      );

      await handleDeleteLocation(0, 5);

      expect(deleteDayLocation).not.toHaveBeenCalled();
      expect(reloadContent).not.toHaveBeenCalled();
    });

    it('deletes the location and reloads', async () => {
      const reloadContent = vi.fn();
      const { handleDeleteLocation } = useDayLocationActions(
        makeTrip(),
        makeContent(),
        reloadContent,
      );

      await handleDeleteLocation(0, 5);

      expect(deleteDayLocation).toHaveBeenCalledWith(1, 5);
      expect(reloadContent).toHaveBeenCalledTimes(1);
    });
  });
});
