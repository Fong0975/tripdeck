import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { importTripsBackup } from '@/api/backup';
import { ApiError } from '@/api/client';
import { showToast } from '@/lib/toast';
import { getFileInput, selectFile, submitForm } from '@/test-utils/queries';
import type { ImportBackupErrorDetails } from '@/types';

import ImportTab from './ImportTab';

vi.mock('@/api/backup', () => ({
  importTripsBackup: vi.fn(),
}));

vi.mock('@/lib/toast');

vi.mock('@/lib/ToastList', () => ({
  ToastList: ({ children }: { children: ReactNode }) => <ul>{children}</ul>,
}));

/** Renders the content of the last showToast(variant, content) call of the given variant, so its text can be asserted with screen queries. */
function renderLastToast(variant: 'success' | 'error' | 'info') {
  const calls = vi.mocked(showToast).mock.calls.filter(c => c[0] === variant);
  expect(calls.length).toBeGreaterThan(0);
  render(<>{calls[calls.length - 1][1]}</>);
}

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

    submitForm(container);

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
    selectFile(container, file);

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
    selectFile(container, file);

    await user.click(screen.getByText('匯入'));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('success', expect.anything()),
    );
    expect(importTripsBackup).toHaveBeenCalledWith(file, false);
    renderLastToast('success');
    expect(screen.getByText('匯入成功')).toBeInTheDocument();
    expect(screen.getByText('Kyoto Trip')).toBeInTheDocument();
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
    selectFile(container, new File(['zip-bytes'], 'backup.zip'));

    await user.click(screen.getByText('匯入'));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('error', expect.anything()),
    );
    renderLastToast('error');
    expect(screen.getByText('匯入失敗')).toBeInTheDocument();
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
    selectFile(container, new File(['zip-bytes'], 'backup.zip'));

    await user.click(screen.getByText('匯入'));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('error', expect.anything()),
    );
    renderLastToast('error');
    expect(
      screen.getByText('Backup file is incomplete: 2 image file(s) missing'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('旅程「Kyoto Trip」缺少 2 張圖片：a.jpg、b.jpg'),
    ).toBeInTheDocument();
  });

  it('shows a plain error message without a details list for a non-ApiError failure', async () => {
    const user = userEvent.setup();
    vi.mocked(importTripsBackup).mockRejectedValue(new Error('network error'));
    const { container } = render(<ImportTab onClose={vi.fn()} />);
    selectFile(container, new File(['zip-bytes'], 'backup.zip'));

    await user.click(screen.getByText('匯入'));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('error', expect.anything()),
    );
    renderLastToast('error');
    expect(screen.getByText('network error')).toBeInTheDocument();
    expect(screen.queryByText(/缺少/)).not.toBeInTheDocument();
  });

  it('shows a generic message when a non-Error value is thrown', async () => {
    const user = userEvent.setup();
    vi.mocked(importTripsBackup).mockRejectedValue('unexpected failure');
    const { container } = render(<ImportTab onClose={vi.fn()} />);
    selectFile(container, new File(['zip-bytes'], 'backup.zip'));

    await user.click(screen.getByText('匯入'));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('error', expect.anything()),
    );
    renderLastToast('error');
    expect(screen.getByText('匯入失敗，請稍後再試')).toBeInTheDocument();
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
    selectFile(container, file);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('匯入'));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('success', '已還原打包清單範本。'),
    );
    expect(importTripsBackup).toHaveBeenCalledWith(file, true);
  });

  it('defaults the restore-template option to off and shows a neutral message when the backup has no trips', async () => {
    const user = userEvent.setup();
    vi.mocked(importTripsBackup).mockResolvedValue({
      imported: [],
      failed: [],
      templateRestored: false,
    });
    const { container } = render(<ImportTab onClose={vi.fn()} />);
    const file = new File(['zip-bytes'], 'backup.zip');
    selectFile(container, file);

    expect(screen.getByRole('checkbox')).not.toBeChecked();

    await user.click(screen.getByText('匯入'));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        'info',
        '這份備份沒有任何旅程可以匯入；若備份包含打包清單範本，需勾選「同時還原打包清單範本」才會套用。',
      ),
    );
    expect(importTripsBackup).toHaveBeenCalledWith(file, false);
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ImportTab onClose={onClose} />);

    await user.click(screen.getByText('取消'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
