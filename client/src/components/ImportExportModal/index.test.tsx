import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Trip } from '@/types';

import ImportExportModal from './index';

vi.mock('./ExportTab', () => ({
  default: ({ trips, onClose }: { trips: Trip[]; onClose: () => void }) => (
    <div data-testid='export-tab'>
      <span>trips: {trips.length}</span>
      <button onClick={onClose}>export-tab-close</button>
    </div>
  ),
}));

vi.mock('./ImportTab', () => ({
  default: ({
    onClose,
    onImported,
  }: {
    onClose: () => void;
    onImported?: () => void;
  }) => (
    <div data-testid='import-tab'>
      <button onClick={onClose}>import-tab-close</button>
      <button onClick={() => onImported?.()}>import-tab-imported</button>
    </div>
  ),
}));

vi.mock('./AutoBackupsTab', () => ({
  default: () => <div data-testid='auto-backups-tab' />,
}));

const trip: Trip = {
  id: 1,
  title: 'Trip A',
  destination: null,
  startDate: '2026-01-01',
  endDate: '2026-01-05',
  createdAt: '2026-01-01',
};

describe('ImportExportModal', () => {
  it('shows the export tab by default, with the trips passed through', () => {
    render(<ImportExportModal trips={[trip]} onClose={vi.fn()} />);

    expect(screen.getByTestId('export-tab')).toBeInTheDocument();
    expect(screen.getByText('trips: 1')).toBeInTheDocument();
    expect(screen.queryByTestId('import-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('auto-backups-tab')).not.toBeInTheDocument();
  });

  it('switches to the import tab', async () => {
    const user = userEvent.setup();
    render(<ImportExportModal trips={[]} onClose={vi.fn()} />);

    await user.click(screen.getByText('匯入旅程'));

    expect(screen.getByTestId('import-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('export-tab')).not.toBeInTheDocument();
  });

  it('switches to the automatic backups tab', async () => {
    const user = userEvent.setup();
    render(<ImportExportModal trips={[]} onClose={vi.fn()} />);

    await user.click(screen.getByText('自動備份'));

    expect(screen.getByTestId('auto-backups-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('export-tab')).not.toBeInTheDocument();
  });

  it('switches back to the export tab', async () => {
    const user = userEvent.setup();
    render(<ImportExportModal trips={[]} onClose={vi.fn()} />);
    await user.click(screen.getByText('匯入旅程'));

    await user.click(screen.getByText('匯出旅程'));

    expect(screen.getByTestId('export-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('import-tab')).not.toBeInTheDocument();
  });

  it('forwards onClose and onImported to the import tab', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onImported = vi.fn();
    render(
      <ImportExportModal
        trips={[]}
        onClose={onClose}
        onImported={onImported}
      />,
    );
    await user.click(screen.getByText('匯入旅程'));

    await user.click(screen.getByText('import-tab-close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('import-tab-imported'));
    expect(onImported).toHaveBeenCalledTimes(1);
  });
});
