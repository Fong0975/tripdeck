import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { exportTripsBackup } from '@/api/backup';
import { showToast } from '@/lib/toast';
import type { Trip } from '@/types';
import { downloadBlob } from '@/utils/download';

import ExportTab from './ExportTab';

vi.mock('@/api/backup', () => ({
  exportTripsBackup: vi.fn(),
}));

vi.mock('@/utils/download', () => ({
  downloadBlob: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({
  showToast: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ExportTab', () => {
  it('shows an empty state with the submit button disabled when there are no trips', () => {
    render(<ExportTab trips={[]} onClose={vi.fn()} />);

    expect(screen.getByText('目前沒有旅程可以匯出。')).toBeInTheDocument();
    expect(screen.getByText('匯出')).toBeDisabled();
  });

  it('disables the submit button until at least one trip is selected', async () => {
    const user = userEvent.setup();
    render(
      <ExportTab
        trips={[makeTrip({ id: 1, title: 'Trip A' })]}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('匯出')).toBeDisabled();

    const [, tripCheckbox] = screen.getAllByRole('checkbox');
    await user.click(tripCheckbox);

    expect(screen.getByText('匯出')).toBeEnabled();
  });

  it('deselects a trip when its checkbox is unchecked again', async () => {
    const user = userEvent.setup();
    render(
      <ExportTab
        trips={[makeTrip({ id: 1, title: 'Trip A' })]}
        onClose={vi.fn()}
      />,
    );
    const [, tripCheckbox] = screen.getAllByRole('checkbox');
    await user.click(tripCheckbox);
    expect(tripCheckbox).toBeChecked();

    await user.click(tripCheckbox);

    expect(tripCheckbox).not.toBeChecked();
    expect(screen.getByText('匯出')).toBeDisabled();
  });

  it('allows exporting just the template when there are no trips', async () => {
    const user = userEvent.setup();
    const blob = new Blob(['zip']);
    vi.mocked(exportTripsBackup).mockResolvedValue(blob);
    render(<ExportTab trips={[]} onClose={vi.fn()} />);
    expect(screen.getByText('匯出')).toBeDisabled();

    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByText('匯出')).toBeEnabled();

    await user.click(screen.getByText('匯出'));

    await waitFor(() =>
      expect(exportTripsBackup).toHaveBeenCalledWith([], true),
    );
  });

  it('does nothing when the export form is submitted with no trips selected', () => {
    const { container } = render(
      <ExportTab
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
    render(<ExportTab trips={trips} onClose={vi.fn()} />);

    await user.click(screen.getByText('全選'));
    screen
      .getAllByRole('checkbox')
      .slice(1)
      .forEach(cb => expect(cb).toBeChecked());
    expect(screen.getByText('匯出')).toBeEnabled();

    await user.click(screen.getByText('取消全選'));
    screen
      .getAllByRole('checkbox')
      .slice(1)
      .forEach(cb => expect(cb).not.toBeChecked());
    expect(screen.getByText('匯出')).toBeDisabled();
  });

  it('exports the selected trips and downloads the returned zip', async () => {
    const user = userEvent.setup();
    const blob = new Blob(['zip']);
    vi.mocked(exportTripsBackup).mockResolvedValue(blob);
    render(
      <ExportTab
        trips={[makeTrip({ id: 7, title: 'Trip A' })]}
        onClose={vi.fn()}
      />,
    );

    const [, tripCheckbox] = screen.getAllByRole('checkbox');
    await user.click(tripCheckbox);
    await user.click(screen.getByText('匯出'));

    await waitFor(() =>
      expect(exportTripsBackup).toHaveBeenCalledWith([7], false),
    );
    expect(downloadBlob).toHaveBeenCalledWith(
      blob,
      expect.stringMatching(/^tripdeck-backup-\d{8}-\d{6}\.zip$/),
    );
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('success', '已成功下載備份檔案。'),
    );
  });

  it('includes the template flag alongside the selected trip when both are checked', async () => {
    const user = userEvent.setup();
    const blob = new Blob(['zip']);
    vi.mocked(exportTripsBackup).mockResolvedValue(blob);
    render(
      <ExportTab
        trips={[makeTrip({ id: 7, title: 'Trip A' })]}
        onClose={vi.fn()}
      />,
    );

    const [templateCheckbox, tripCheckbox] = screen.getAllByRole('checkbox');
    await user.click(templateCheckbox);
    await user.click(tripCheckbox);
    await user.click(screen.getByText('匯出'));

    await waitFor(() =>
      expect(exportTripsBackup).toHaveBeenCalledWith([7], true),
    );
  });

  it('shows an error message and does not download when the export fails', async () => {
    const user = userEvent.setup();
    vi.mocked(exportTripsBackup).mockRejectedValue(new Error('network error'));
    render(
      <ExportTab
        trips={[makeTrip({ id: 7, title: 'Trip A' })]}
        onClose={vi.fn()}
      />,
    );

    const [, tripCheckbox] = screen.getAllByRole('checkbox');
    await user.click(tripCheckbox);
    await user.click(screen.getByText('匯出'));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('error', '匯出失敗，請稍後再試'),
    );
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ExportTab trips={[]} onClose={onClose} />);

    await user.click(screen.getByText('取消'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
