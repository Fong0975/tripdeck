import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DayPlan } from '@/types';
import { deleteDayImage, uploadDayImage } from '@/utils/storage';

import EditDayNoteModal from './EditDayNoteModal';

vi.mock('@/utils/storage', () => ({
  uploadDayImage: vi.fn(),
  deleteDayImage: vi.fn(),
}));

const day: DayPlan = {
  id: 10,
  day: 2,
  date: '2026-01-02',
  notes: 'Bring an umbrella',
  locations: [],
  attractions: [],
  connections: [],
};

// The upload <input type="file"> has no accessible label, so it can only
// be reached by its type attribute rather than a testing-library query.
function getFileInput(container: HTMLElement): HTMLInputElement {
  // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom does not implement the Blob URL APIs used to preview a pending file.
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
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
    const user = userEvent.setup();
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
    const user = userEvent.setup();
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

  it('uploads a new image via the image section', async () => {
    const newImage = { id: 2, filename: 'b.jpg', title: 'New' };
    vi.mocked(uploadDayImage).mockResolvedValue(newImage);
    const user = userEvent.setup();
    const { container } = render(
      <EditDayNoteModal
        tripId={1}
        day={day}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    const file = new File(['a'], 'b.jpg');
    fireEvent.change(getFileInput(container), { target: { files: [file] } });
    await user.type(screen.getByPlaceholderText('圖片標題（必填）'), 'New');

    await user.click(screen.getByText('確認上傳'));

    await waitFor(() =>
      expect(uploadDayImage).toHaveBeenCalledWith(1, 10, file, 'New'),
    );
    expect(await screen.findByAltText('New')).toBeInTheDocument();
  });

  it('deletes an image via the image section', async () => {
    vi.mocked(deleteDayImage).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <EditDayNoteModal
        tripId={1}
        day={{
          ...day,
          images: [{ id: 1, filename: 'a.jpg', title: 'Cover' }],
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByAltText('Cover')).toBeInTheDocument();

    await user.click(screen.getByTitle('刪除圖片'));

    await waitFor(() => expect(deleteDayImage).toHaveBeenCalledWith(1, 10, 1));
    expect(screen.queryByAltText('Cover')).not.toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
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
