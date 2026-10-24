import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeAttraction, makeDay } from '@/test-utils/fixtures';
import type { DayPlan } from '@/types';

import DayMapModal from './index';

function makeDays(): DayPlan[] {
  return [
    makeDay({
      id: 1,
      day: 1,
      date: '2026-01-01',
      attractions: [makeAttraction({ id: 10 }), makeAttraction({ id: 11 })],
    }),
    makeDay({ id: 2, day: 2, date: '2026-01-02' }),
    makeDay({
      id: 3,
      day: 3,
      date: '2026-01-03',
      attractions: [makeAttraction({ id: 30 })],
    }),
  ];
}

function renderModal(initialDayIndex = 0, onClose = vi.fn()) {
  render(
    <DayMapModal
      days={makeDays()}
      initialDayIndex={initialDayIndex}
      onClose={onClose}
    />,
  );
  return { onClose };
}

function getSelectedTab() {
  return screen.getByRole('tab', { selected: true });
}

describe('DayMapModal', () => {
  it('renders a tab for every day with its date', () => {
    renderModal();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('第 1 天');
    expect(tabs[0]).toHaveTextContent('1/1');
    expect(tabs[2]).toHaveTextContent('第 3 天');
    expect(tabs[2]).toHaveTextContent('1/3');
  });

  it.each([0, 1, 2])('opens on the day at index %i', initialDayIndex => {
    renderModal(initialDayIndex);

    expect(getSelectedTab()).toHaveTextContent(`第 ${initialDayIndex + 1} 天`);
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      getSelectedTab().id,
    );
  });

  it('switches the panel to the clicked day', async () => {
    const user = userEvent.setup();
    renderModal(0);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('2 個景點');

    await user.click(screen.getByRole('tab', { name: /第 3 天/ }));

    expect(getSelectedTab()).toHaveTextContent('第 3 天');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('1 個景點');
  });

  it('only keeps the selected tab in the tab order', () => {
    renderModal(1);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map(tab => tab.tabIndex)).toEqual([-1, 0, -1]);
  });

  it.each([
    { description: 'moves right', key: '{ArrowRight}', start: 0, expected: 1 },
    { description: 'moves left', key: '{ArrowLeft}', start: 2, expected: 1 },
    {
      description: 'wraps from the last tab to the first',
      key: '{ArrowRight}',
      start: 2,
      expected: 0,
    },
    {
      description: 'wraps from the first tab to the last',
      key: '{ArrowLeft}',
      start: 0,
      expected: 2,
    },
  ])('arrow key navigation $description', async ({ key, start, expected }) => {
    const user = userEvent.setup();
    renderModal(start);
    getSelectedTab().focus();

    await user.keyboard(key);

    expect(getSelectedTab()).toBe(screen.getAllByRole('tab')[expected]);
    expect(getSelectedTab()).toHaveFocus();
  });

  it('ignores other keys on the tab list', async () => {
    const user = userEvent.setup();
    renderModal(1);
    getSelectedTab().focus();

    await user.keyboard('a');

    expect(getSelectedTab()).toHaveTextContent('第 2 天');
  });

  it.each([
    {
      description: 'Escape is pressed',
      act: (user: ReturnType<typeof userEvent.setup>) =>
        user.keyboard('{Escape}'),
    },
    {
      description: 'the close button is clicked',
      act: (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByLabelText('關閉地圖')),
    },
  ])('closes when $description', async ({ act }) => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await act(user);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked but not when the panel is', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('day-map-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when the initial day does not exist', () => {
    renderModal(9);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stops listening for Escape after unmount', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { unmount } = render(
      <DayMapModal days={makeDays()} initialDayIndex={0} onClose={onClose} />,
    );

    unmount();
    await user.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });
});
