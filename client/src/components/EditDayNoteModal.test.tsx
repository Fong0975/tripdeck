import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeDay, makeImage } from '@/test-utils/fixtures';
import { selectFile, submitForm } from '@/test-utils/queries';
import { setupUser } from '@/test-utils/render';
import { deleteDayImage, uploadDayImage } from '@/utils/storage';

import EditDayNoteModal from './EditDayNoteModal';

vi.mock('@/utils/storage');

const day = makeDay({
  id: 10,
  day: 2,
  date: '2026-01-02',
  notes: 'Bring an umbrella',
});

describe('EditDayNoteModal', () => {
  it('shows the day number in the title and pre-fills the notes textarea', () => {
    render(
      <EditDayNoteModal
        tripId={1}
        day={day}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText('第 2 天備註')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bring an umbrella')).toBeInTheDocument();
  });

  it('calls onSave with the trimmed notes on submit', async () => {
    const onSave = vi.fn();
    const user = setupUser();
    render(
      <EditDayNoteModal
        tripId={1}
        day={{ ...day, notes: '' }}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    await user.type(
      screen.getByPlaceholderText('這天的備註...'),
      '  Pack sunscreen  ',
    );
    await user.click(screen.getByText('儲存'));

    expect(onSave).toHaveBeenCalledWith('Pack sunscreen');
  });

  it('calls onSave with null when the notes are cleared', async () => {
    const onSave = vi.fn();
    const user = setupUser();
    render(
      <EditDayNoteModal
        tripId={1}
        day={day}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    await user.clear(screen.getByDisplayValue('Bring an umbrella'));
    await user.click(screen.getByText('儲存'));

    expect(onSave).toHaveBeenCalledWith(null);
  });

  it('deletes an existing image and uploads a new one via the image section, notifying onImagesChanged each time', async () => {
    vi.mocked(deleteDayImage).mockResolvedValue(undefined);
    const onImagesChanged = vi.fn();
    const newImage = makeImage({ id: 2, filename: 'b.jpg', title: 'New' });
    vi.mocked(uploadDayImage).mockResolvedValue(newImage);
    const user = setupUser();
    const { container } = render(
      <EditDayNoteModal
        tripId={1}
        day={{
          ...day,
          images: [makeImage({ filename: 'a.jpg', title: 'Cover' })],
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onImagesChanged={onImagesChanged}
      />,
    );
    expect(screen.getByAltText('Cover')).toBeInTheDocument();

    await user.click(screen.getByTitle('刪除圖片'));

    await waitFor(() => expect(deleteDayImage).toHaveBeenCalledWith(1, 10, 1));
    expect(screen.queryByAltText('Cover')).not.toBeInTheDocument();
    expect(onImagesChanged).toHaveBeenCalledTimes(1);

    const file = new File(['a'], 'b.jpg', { type: 'image/jpeg' });
    selectFile(container, file);
    await user.type(screen.getByPlaceholderText('圖片標題（必填）'), 'New');
    await user.click(screen.getByText('確認上傳'));

    await waitFor(() =>
      expect(uploadDayImage).toHaveBeenCalledWith(1, 10, file, 'New'),
    );
    expect(await screen.findByAltText('New')).toBeInTheDocument();
    expect(onImagesChanged).toHaveBeenCalledTimes(2);
  });

  it('ignores repeated submits until the pending save settles', async () => {
    let resolveSave!: () => void;
    const onSave = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveSave = resolve;
        }),
    );
    const { container } = render(
      <EditDayNoteModal
        tripId={1}
        day={day}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    submitForm(container);
    submitForm(container);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole('button', { name: '儲存中…' }),
    ).toBeDisabled();

    await act(async () => resolveSave());
    submitForm(container);

    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = setupUser();
    render(
      <EditDayNoteModal
        tripId={1}
        day={day}
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );

    await user.click(screen.getByText('取消'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
