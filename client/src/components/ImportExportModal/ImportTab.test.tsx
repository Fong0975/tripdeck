import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { importTripsBackup } from '@/api/backup';
import { ApiError } from '@/api/client';
import type { ImportBackupErrorDetails } from '@/types';

import ImportTab from './ImportTab';

vi.mock('@/api/backup', () => ({
  importTripsBackup: vi.fn(),
}));

// The backup-file <input type="file"> has no accessible label, so it can
// only be reached by its type attribute rather than a testing-library query.
function getFileInput(container: HTMLElement): HTMLInputElement {
  // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ImportTab', () => {
  it('shows the file picker with the submit button disabled by default', () => {
    render(<ImportTab onClose={vi.fn()} />);

    expect(screen.getByText('選擇備份檔案')).toBeInTheDocument();
    expect(screen.getByText('匯入')).toBeDisabled();
  });

  it('triggers the hidden file input when the file picker button is clicked', () => {
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {});
    const { container } = render(<ImportTab onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('選擇備份檔案'));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy.mock.instances[0]).toBe(getFileInput(container));
    clickSpy.mockRestore();
  });

  it('does nothing when the import form is submitted with no file selected', () => {
    const { container } = render(<ImportTab onClose={vi.fn()} />);

    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    expect(importTripsBackup).not.toHaveBeenCalled();
  });

  it('does nothing when the file input change event carries no files', () => {
    const { container } = render(<ImportTab onClose={vi.fn()} />);

    fireEvent.change(getFileInput(container), { target: { files: [] } });

    expect(screen.getByText('選擇備份檔案')).toBeInTheDocument();
    expect(screen.getByText('匯入')).toBeDisabled();
  });

  it('enables the submit button once a file is selected and clears it via the remove button', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImportTab onClose={vi.fn()} />);

    const file = new File(['zip-bytes'], 'backup.zip');
    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    expect(screen.getByText('backup.zip')).toBeInTheDocument();
    expect(screen.getByText('匯入')).toBeEnabled();

    await user.click(screen.getByText('移除'));

    expect(screen.queryByText('backup.zip')).not.toBeInTheDocument();
    expect(screen.getByText('匯入')).toBeDisabled();
  });

  it('imports the selected file, shows the imported list, and notifies the parent', async () => {
    const user = userEvent.setup();
    const onImported = vi.fn();
    vi.mocked(importTripsBackup).mockResolvedValue({
      imported: [{ originalTripId: 1, newTripId: 10, title: 'Kyoto Trip' }],
      failed: [],
      templateRestored: false,
    });
    const { container } = render(
      <ImportTab onClose={vi.fn()} onImported={onImported} />,
    );
    const file = new File(['zip-bytes'], 'backup.zip');
    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    await user.click(screen.getByText('匯入'));

    await waitFor(() =>
      expect(importTripsBackup).toHaveBeenCalledWith(file, false),
    );
    expect(await screen.findByText('Kyoto Trip')).toBeInTheDocument();
    expect(screen.getByText('匯入成功')).toBeInTheDocument();
    expect(onImported).toHaveBeenCalledTimes(1);
  });

  it('shows the failed list and does not notify the parent when every trip fails', async () => {
    const user = userEvent.setup();
    const onImported = vi.fn();
    vi.mocked(importTripsBackup).mockResolvedValue({
      imported: [],
      failed: [{ originalTripId: 1, title: 'Kyoto Trip', error: 'boom' }],
      templateRestored: false,
    });
    const { container } = render(
      <ImportTab onClose={vi.fn()} onImported={onImported} />,
    );
    fireEvent.change(getFileInput(container), {
      target: { files: [new File(['zip-bytes'], 'backup.zip')] },
    });

    await user.click(screen.getByText('匯入'));

    expect(await screen.findByText('匯入失敗')).toBeInTheDocument();
    expect(screen.getByText('Kyoto Trip：boom')).toBeInTheDocument();
    expect(onImported).not.toHaveBeenCalled();
  });

  it('shows the validation error message and per-trip missing-image details from an ApiError', async () => {
    const user = userEvent.setup();
    const details: ImportBackupErrorDetails = {
      trips: [
        {
          folder: 'trip_1',
          title: 'Kyoto Trip',
          missingFilenames: ['a.jpg', 'b.jpg'],
        },
      ],
    };
    vi.mocked(importTripsBackup).mockRejectedValue(
      new ApiError(
        'Backup file is incomplete: 2 image file(s) missing',
        details,
      ),
    );
    const { container } = render(<ImportTab onClose={vi.fn()} />);
    fireEvent.change(getFileInput(container), {
      target: { files: [new File(['zip-bytes'], 'backup.zip')] },
    });

    await user.click(screen.getByText('匯入'));

    expect(
      await screen.findByText(
        'Backup file is incomplete: 2 image file(s) missing',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('旅程「Kyoto Trip」缺少 2 張圖片：a.jpg、b.jpg'),
    ).toBeInTheDocument();
  });

  it('shows a plain error message without a details list for a non-ApiError failure', async () => {
    const user = userEvent.setup();
    vi.mocked(importTripsBackup).mockRejectedValue(new Error('network error'));
    const { container } = render(<ImportTab onClose={vi.fn()} />);
    fireEvent.change(getFileInput(container), {
      target: { files: [new File(['zip-bytes'], 'backup.zip')] },
    });

    await user.click(screen.getByText('匯入'));

    expect(await screen.findByText('network error')).toBeInTheDocument();
    expect(screen.queryByText(/缺少/)).not.toBeInTheDocument();
  });

  it('shows a generic message when a non-Error value is thrown', async () => {
    const user = userEvent.setup();
    vi.mocked(importTripsBackup).mockRejectedValue('unexpected failure');
    const { container } = render(<ImportTab onClose={vi.fn()} />);
    fireEvent.change(getFileInput(container), {
      target: { files: [new File(['zip-bytes'], 'backup.zip')] },
    });

    await user.click(screen.getByText('匯入'));

    expect(await screen.findByText('匯入失敗，請稍後再試')).toBeInTheDocument();
  });

  it('defaults the restore-template option to off and submits it as false', async () => {
    const user = userEvent.setup();
    vi.mocked(importTripsBackup).mockResolvedValue({
      imported: [],
      failed: [],
      templateRestored: false,
    });
    const { container } = render(<ImportTab onClose={vi.fn()} />);
    const file = new File(['zip-bytes'], 'backup.zip');
    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    expect(screen.getByRole('checkbox')).not.toBeChecked();

    await user.click(screen.getByText('匯入'));

    await waitFor(() =>
      expect(importTripsBackup).toHaveBeenCalledWith(file, false),
    );
  });

  it('submits restoreTemplate: true when the checkbox is checked, and shows the restored confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(importTripsBackup).mockResolvedValue({
      imported: [],
      failed: [],
      templateRestored: true,
    });
    const { container } = render(<ImportTab onClose={vi.fn()} />);
    const file = new File(['zip-bytes'], 'backup.zip');
    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('匯入'));

    await waitFor(() =>
      expect(importTripsBackup).toHaveBeenCalledWith(file, true),
    );
    expect(await screen.findByText('已還原打包清單範本。')).toBeInTheDocument();
  });

  it('shows a neutral message when the backup has no trips and the template was not restored', async () => {
    const user = userEvent.setup();
    vi.mocked(importTripsBackup).mockResolvedValue({
      imported: [],
      failed: [],
      templateRestored: false,
    });
    const { container } = render(<ImportTab onClose={vi.fn()} />);
    fireEvent.change(getFileInput(container), {
      target: { files: [new File(['zip-bytes'], 'backup.zip')] },
    });

    await user.click(screen.getByText('匯入'));

    expect(
      await screen.findByText(
        '這份備份沒有任何旅程可以匯入；若備份包含打包清單範本，需勾選「同時還原打包清單範本」才會套用。',
      ),
    ).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ImportTab onClose={onClose} />);

    await user.click(screen.getByText('取消'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
