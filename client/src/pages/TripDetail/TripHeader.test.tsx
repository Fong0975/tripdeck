import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { describe, expect, it, vi } from 'vitest';

import type { Trip } from '@/types';

import TripHeader from './TripHeader';

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 1,
    title: 'Japan Trip',
    destination: null,
    startDate: '2026-08-20',
    endDate: '2026-08-22',
    createdAt: '2026-08-01',
    ...overrides,
  };
}

describe('TripHeader', () => {
  it('renders the trip title and the formatted date range', () => {
    render(
      <TripHeader
        trip={makeTrip()}
        onBack={vi.fn()}
        onExport={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText('Japan Trip')).toBeInTheDocument();
    const start = format(parseISO('2026-08-20'), 'yyyy/MM/dd', {
      locale: zhTW,
    });
    const end = format(parseISO('2026-08-22'), 'yyyy/MM/dd', {
      locale: zhTW,
    });
    expect(screen.getByText(`${start} – ${end}`)).toBeInTheDocument();
  });

  it('shows the total day count', () => {
    render(
      <TripHeader
        trip={makeTrip()}
        onBack={vi.fn()}
        onExport={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText('3 天')).toBeInTheDocument();
  });

  it.each([
    { description: 'a destination is set', destination: 'Tokyo' },
    { description: 'no destination is set', destination: null },
  ])('shows the destination only when $description', ({ destination }) => {
    render(
      <TripHeader
        trip={makeTrip({ destination })}
        onBack={vi.fn()}
        onExport={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    if (destination) {
      expect(screen.getByText(destination)).toBeInTheDocument();
    } else {
      expect(screen.queryByText('Tokyo')).not.toBeInTheDocument();
    }
  });

  it('calls onBack when the back button is clicked', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(
      <TripHeader
        trip={makeTrip()}
        onBack={onBack}
        onExport={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('返回首頁'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onExport when the export button is clicked', async () => {
    const onExport = vi.fn();
    const user = userEvent.setup();
    render(
      <TripHeader
        trip={makeTrip()}
        onBack={vi.fn()}
        onExport={onExport}
        onEdit={vi.fn()}
      />,
    );

    await user.click(screen.getByText('匯出'));

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when the edit button is clicked', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(
      <TripHeader
        trip={makeTrip()}
        onBack={vi.fn()}
        onExport={vi.fn()}
        onEdit={onEdit}
      />,
    );

    await user.click(screen.getByLabelText('編輯旅程資訊'));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it.each([
    { exporting: false, expectedLabel: '匯出', expectedDisabled: false },
    { exporting: true, expectedLabel: '匯出中…', expectedDisabled: true },
  ])(
    'shows "$expectedLabel" and disabled=$expectedDisabled',
    ({ exporting, expectedLabel, expectedDisabled }) => {
      render(
        <TripHeader
          trip={makeTrip()}
          onBack={vi.fn()}
          onExport={vi.fn()}
          onEdit={vi.fn()}
          exporting={exporting}
        />,
      );

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      const exportButton = screen.getByTitle('匯出行程');
      if (expectedDisabled) {
        expect(exportButton).toBeDisabled();
      } else {
        expect(exportButton).toBeEnabled();
      }
    },
  );
});
