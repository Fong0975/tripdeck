import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Trip, TripContent } from '@/types';
import { updateDayNotes } from '@/utils/storage';

import { useDayNoteActions } from './useDayNoteActions';

vi.mock('@/utils/storage', () => ({
  updateDayNotes: vi.fn(),
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

describe('useDayNoteActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { description: 'trip is null', trip: null, content: makeContent() },
    { description: 'content is null', trip: makeTrip(), content: null },
  ])('does nothing when $description', async ({ trip, content }) => {
    const reloadContent = vi.fn();
    const closeModal = vi.fn();
    const { handleSaveDayNotes } = useDayNoteActions(
      trip,
      content,
      reloadContent,
      closeModal,
    );

    await handleSaveDayNotes(0, 'New notes');

    expect(updateDayNotes).not.toHaveBeenCalled();
    expect(reloadContent).not.toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
  });

  it('updates the day notes, reloads content, and closes the modal', async () => {
    const reloadContent = vi.fn();
    const closeModal = vi.fn();
    const { handleSaveDayNotes } = useDayNoteActions(
      makeTrip(),
      makeContent(),
      reloadContent,
      closeModal,
    );

    await handleSaveDayNotes(0, 'New notes');

    expect(updateDayNotes).toHaveBeenCalledWith(1, 10, 'New notes');
    expect(reloadContent).toHaveBeenCalledTimes(1);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });
});
