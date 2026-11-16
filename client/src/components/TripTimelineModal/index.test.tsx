import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeAttraction, makeDay } from '@/test-utils/fixtures';
import type { DayPlan } from '@/types';

import TripTimelineModal from './index';

function makeDays(): DayPlan[] {
  return [
    makeDay({
      id: 1,
      day: 1,
      date: '2026-01-01',
      attractions: [
        makeAttraction({
          id: 10,
          name: 'Museum',
          startTime: '09:00',
          endTime: '11:00',
        }),
        makeAttraction({
          id: 11,
          name: 'Cafe',
          startTime: '10:00',
          endTime: '12:00',
        }),
        makeAttraction({ id: 12, name: 'Market' }),
      ],
    }),
    makeDay({ id: 2, day: 2, date: '2026-01-02' }),
  ];
}

function mountModal(days = makeDays(), onClose = vi.fn()) {
  render(<TripTimelineModal days={days} onClose={onClose} />);
  return onClose;
}

describe('TripTimelineModal', () => {
  it('renders a labelled dialog with one header per day', () => {
    mountModal();

    expect(
      screen.getByRole('dialog', { name: '行程時間軸' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Day 1')).toBeInTheDocument();
    expect(screen.getByText('Day 2')).toBeInTheDocument();
  });

  it('shows scheduled attractions with their times', () => {
    mountModal();

    expect(screen.getByText('Museum')).toBeInTheDocument();
    expect(screen.getByText('09:00–11:00')).toBeInTheDocument();
    expect(screen.getByText('Cafe')).toBeInTheDocument();
  });

  it('lists attractions without a time in the unscheduled section', () => {
    mountModal();

    expect(screen.getByText('未排時間')).toBeInTheDocument();
    expect(screen.getByText('Market')).toBeInTheDocument();
  });

  it.each([
    {
      description: 'no day has a scheduled attraction',
      days: [makeDay({ attractions: [makeAttraction({ name: 'Market' })] })],
      text: '尚未為任何景點設定時間',
    },
    { description: 'the trip has no days', days: [], text: '尚無行程可顯示' },
  ])('shows an empty state when $description', ({ days, text }) => {
    mountModal(days);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('omits the unscheduled section when every attraction has a time', () => {
    mountModal([
      makeDay({
        attractions: [
          makeAttraction({
            name: 'Museum',
            startTime: '09:00',
            endTime: '10:00',
          }),
        ],
      }),
    ]);

    expect(screen.queryByText('未排時間')).not.toBeInTheDocument();
  });

  it.each([
    {
      description: 'the close button',
      close: () =>
        userEvent.click(screen.getByRole('button', { name: '關閉時間軸' })),
    },
    {
      description: 'Escape',
      close: () => userEvent.keyboard('{Escape}'),
    },
    {
      description: 'a backdrop click',
      close: () => userEvent.click(screen.getByTestId('timeline-backdrop')),
    },
  ])('closes on $description', async ({ close }) => {
    const onClose = mountModal();

    await close();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
