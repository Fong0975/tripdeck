import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listAutoBackups } from '@/api/backup';

import AutoBackupsTab from './AutoBackupsTab';

vi.mock('@/api/backup', () => ({
  listAutoBackups: vi.fn(),
  getAutoBackupDownloadUrl: vi.fn(
    (filename: string) => `/api/backups/${filename}`,
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AutoBackupsTab', () => {
  it('loads and renders the automatic backup list on mount', async () => {
    vi.mocked(listAutoBackups).mockResolvedValue([
      {
        filename: 'tripdeck-auto-backup-2026-08-26T00-00-00-000Z.zip',
        sizeBytes: 2048,
        createdAt: '2026-08-26T00:00:00.000Z',
      },
    ]);
    render(<AutoBackupsTab />);

    expect(listAutoBackups).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('下載')).toHaveAttribute(
      'href',
      '/api/backups/tripdeck-auto-backup-2026-08-26T00-00-00-000Z.zip',
    );
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
  });

  it('formats file sizes across the bytes/KB/MB/GB range', async () => {
    vi.mocked(listAutoBackups).mockResolvedValue([
      {
        filename: 'tripdeck-auto-backup-2026-08-01T00-00-00-000Z.zip',
        sizeBytes: 500,
        createdAt: '2026-08-01T00:00:00.000Z',
      },
      {
        filename: 'tripdeck-auto-backup-2026-08-02T00-00-00-000Z.zip',
        sizeBytes: 5 * 1024 * 1024,
        createdAt: '2026-08-02T00:00:00.000Z',
      },
      {
        filename: 'tripdeck-auto-backup-2026-08-03T00-00-00-000Z.zip',
        sizeBytes: 3 * 1024 * 1024 * 1024,
        createdAt: '2026-08-03T00:00:00.000Z',
      },
    ]);
    render(<AutoBackupsTab />);

    expect(await screen.findByText('500 B')).toBeInTheDocument();
    expect(screen.getByText('5.0 MB')).toBeInTheDocument();
    expect(screen.getByText('3.0 GB')).toBeInTheDocument();
  });

  it('shows an empty-state message when there are no automatic backups', async () => {
    vi.mocked(listAutoBackups).mockResolvedValue([]);
    render(<AutoBackupsTab />);

    expect(
      await screen.findByText('目前還沒有任何自動備份。'),
    ).toBeInTheDocument();
  });

  it('shows an error message when loading the list fails', async () => {
    vi.mocked(listAutoBackups).mockRejectedValue(new Error('network error'));
    render(<AutoBackupsTab />);

    expect(
      await screen.findByText('讀取自動備份清單失敗，請稍後再試'),
    ).toBeInTheDocument();
  });

  it('re-fetches the list when the refresh button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(listAutoBackups).mockResolvedValue([]);
    render(<AutoBackupsTab />);
    await screen.findByText('目前還沒有任何自動備份。');

    await user.click(screen.getByText('重新整理'));

    expect(listAutoBackups).toHaveBeenCalledTimes(2);
  });
});
