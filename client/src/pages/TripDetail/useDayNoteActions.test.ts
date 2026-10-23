import { describe, expect, it, vi } from 'vitest';

import { showToast } from '@/lib/toast';
import { makeContent, makeTrip } from '@/test-utils/fixtures';
import { updateDayNotes } from '@/utils/storage';

import { useDayNoteActions } from './useDayNoteActions';

vi.mock('@/utils/storage');

vi.mock('@/lib/toast');

describe('useDayNoteActions', () => {
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
    expect(showToast).toHaveBeenCalledWith('success', '已儲存每日備註。');
  });

  it('shows an error toast and does not reload or close the modal when saving fails', async () => {
    const reloadContent = vi.fn();
    const closeModal = vi.fn();
    vi.mocked(updateDayNotes).mockRejectedValue(new Error('network error'));
    const { handleSaveDayNotes } = useDayNoteActions(
      makeTrip(),
      makeContent(),
      reloadContent,
      closeModal,
    );

    await handleSaveDayNotes(0, 'New notes');

    expect(reloadContent).not.toHaveBeenCalled();
    expect(closeModal).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      'error',
      '儲存每日備註失敗，請稍後再試',
    );
  });
});
