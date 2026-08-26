import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { exportTripsBackup, importTripsBackup } from '@/api/backup';
import { ApiError } from '@/api/client';
import type { ImportBackupErrorDetails, Trip } from '@/types';
import { downloadBlob } from '@/utils/download';

import ImportExportModal from './ImportExportModal';

vi.mock('@/api/backup', () => ({
  exportTripsBackup: vi.fn(),
  importTripsBackup: vi.fn(),
}));

vi.mock('@/utils/download', () => ({
  downloadBlob: vi.fn(),
}));

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 1,
    title: 'Trip A',
    destination: null,
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    createdAt: '2026-01-01',
    ...overrides,
  };
}

// The backup-file <input type="file"> has no accessible label, so it can
// only be reached by its type attribute rather than a testing-library query.
function getFileInput(container: HTMLElement): HTMLInputElement {
  // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ImportExportModal', () => {
  it('shows an empty state with the submit button disabled when there are no trips', () => {
    render(<ImportExportModal trips={[]} onClose={vi.fn()} />);

    expect(screen.getByText('目前沒有旅程可以匯出。')).toBeInTheDocument();
    expect(screen.getByText('匯出')).toBeDisabled();
  });

  it('disables the submit button until at least one trip is selected', async () => {
    const user = userEvent.setup();
    render(
      <ImportExportModal
        trips={[makeTrip({ id: 1, title: 'Trip A' })]}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('匯出')).toBeDisabled();

    await user.click(screen.getByRole('checkbox'));

    expect(screen.getByText('匯出')).toBeEnabled();
  });

  it('deselects a trip when its checkbox is unchecked again', async () => {
    const user = userEvent.setup();
    render(
      <ImportExportModal
        trips={[makeTrip({ id: 1, title: 'Trip A' })]}
        onClose={vi.fn()}
      />,
    );
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('匯出')).toBeDisabled();
  });

  it('does nothing when the export form is submitted with no trips selected', () => {
    const { container } = render(
      <ImportExportModal
        trips={[makeTrip({ id: 1, title: 'Trip A' })]}
        onClose={vi.fn()}
      />,
    );

    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    expect(exportTripsBackup).not.toHaveBeenCalled();
  });

  it('selects and deselects every trip via the select-all toggle', async () => {
    const user = userEvent.setup();
    const trips = [
      makeTrip({ id: 1, title: 'Trip A' }),
      makeTrip({ id: 2, title: 'Trip B' }),
    ];
    render(<ImportExportModal trips={trips} onClose={vi.fn()} />);

    await user.click(screen.getByText('全選'));
    screen.getAllByRole('checkbox').forEach(cb => expect(cb).toBeChecked());
    expect(screen.getByText('匯出')).toBeEnabled();

    await user.click(screen.getByText('取消全選'));
    screen.getAllByRole('checkbox').forEach(cb => expect(cb).not.toBeChecked());
    expect(screen.getByText('匯出')).toBeDisabled();
  });

  it('exports the selected trips and downloads the returned zip', async () => {
    const user = userEvent.setup();
    const blob = new Blob(['zip']);
    vi.mocked(exportTripsBackup).mockResolvedValue(blob);
    render(
      <ImportExportModal
        trips={[makeTrip({ id: 7, title: 'Trip A' })]}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('匯出'));

    await waitFor(() => expect(exportTripsBackup).toHaveBeenCalledWith([7]));
    expect(downloadBlob).toHaveBeenCalledWith(
      blob,
      expect.stringMatching(/^tripdeck-backup-\d{8}-\d{6}\.zip$/),
    );
    expect(await screen.findByText('已成功下載備份檔案。')).toBeInTheDocument();
  });

  it('shows an error message and does not download when the export fails', async () => {
    const user = userEvent.setup();
    vi.mocked(exportTripsBackup).mockRejectedValue(new Error('network error'));
    render(
      <ImportExportModal
        trips={[makeTrip({ id: 7, title: 'Trip A' })]}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('匯出'));

    expect(await screen.findByText('匯出失敗，請稍後再試')).toBeInTheDocument();
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ImportExportModal trips={[]} onClose={onClose} />);

    await user.click(screen.getByText('取消'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ImportExportModal import tab', () => {
  it('switches to the import tab and shows its file picker instead of the export list', async () => {
    const user = userEvent.setup();
    render(
      <ImportExportModal
        trips={[makeTrip({ id: 1, title: 'Trip A' })]}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByText('匯入旅程'));

    expect(screen.getByText('選擇備份檔案')).toBeInTheDocument();
    expect(screen.queryByText('選擇要匯出的旅程')).not.toBeInTheDocument();
    expect(screen.getByText('匯入')).toBeDisabled();
  });

  it('switches back to the export tab', async () => {
    const user = userEvent.setup();
    render(
      <ImportExportModal
        trips={[makeTrip({ id: 1, title: 'Trip A' })]}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getByText('匯入旅程'));
    expect(screen.getByText('選擇備份檔案')).toBeInTheDocument();

    await user.click(screen.getByText('匯出旅程'));

    expect(screen.getByText('選擇要匯出的旅程')).toBeInTheDocument();
    expect(screen.queryByText('選擇備份檔案')).not.toBeInTheDocument();
  });

  it('triggers the hidden file input when the file picker button is clicked', () => {
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(() => {});
    const { container } = render(
      <ImportExportModal trips={[]} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('匯入旅程'));

    fireEvent.click(screen.getByText('選擇備份檔案'));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy.mock.instances[0]).toBe(getFileInput(container));
    clickSpy.mockRestore();
  });

  it('does nothing when the import form is submitted with no file selected', () => {
    const { container } = render(
      <ImportExportModal trips={[]} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('匯入旅程'));

    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    expect(importTripsBackup).not.toHaveBeenCalled();
  });

  it('does nothing when the file input change event carries no files', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ImportExportModal trips={[]} onClose={vi.fn()} />,
    );
    await user.click(screen.getByText('匯入旅程'));

    fireEvent.change(getFileInput(container), { target: { files: [] } });

    expect(screen.getByText('選擇備份檔案')).toBeInTheDocument();
    expect(screen.getByText('匯入')).toBeDisabled();
  });

  it('enables the submit button once a file is selected and clears it via the remove button', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ImportExportModal trips={[]} onClose={vi.fn()} />,
    );
    await user.click(screen.getByText('匯入旅程'));

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
    });
    const { container } = render(
      <ImportExportModal
        trips={[]}
        onClose={vi.fn()}
        onImported={onImported}
      />,
    );
    await user.click(screen.getByText('匯入旅程'));
    const file = new File(['zip-bytes'], 'backup.zip');
    fireEvent.change(getFileInput(container), { target: { files: [file] } });

    await user.click(screen.getByText('匯入'));

    await waitFor(() => expect(importTripsBackup).toHaveBeenCalledWith(file));
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
    });
    const { container } = render(
      <ImportExportModal
        trips={[]}
        onClose={vi.fn()}
        onImported={onImported}
      />,
    );
    await user.click(screen.getByText('匯入旅程'));
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
    const { container } = render(
      <ImportExportModal trips={[]} onClose={vi.fn()} />,
    );
    await user.click(screen.getByText('匯入旅程'));
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
    const { container } = render(
      <ImportExportModal trips={[]} onClose={vi.fn()} />,
    );
    await user.click(screen.getByText('匯入旅程'));
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
    const { container } = render(
      <ImportExportModal trips={[]} onClose={vi.fn()} />,
    );
    await user.click(screen.getByText('匯入旅程'));
    fireEvent.change(getFileInput(container), {
      target: { files: [new File(['zip-bytes'], 'backup.zip')] },
    });

    await user.click(screen.getByText('匯入'));

    expect(await screen.findByText('匯入失敗，請稍後再試')).toBeInTheDocument();
  });
});
