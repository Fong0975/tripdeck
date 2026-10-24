import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeDay } from '@/test-utils/fixtures';
import type { DayPlan } from '@/types';

import DayTabs from './DayTabs';

function makeDays(): DayPlan[] {
  return [
    makeDay({ id: 1, day: 1, date: '2026-01-01' }),
    makeDay({ id: 2, day: 2, date: '2026-01-02' }),
    makeDay({ id: 3, day: 3, date: '2026-01-03' }),
  ];
}

function renderTabs(activeIndex = 0, onSelect = vi.fn()) {
  render(
    <DayTabs
      days={makeDays()}
      activeIndex={activeIndex}
      onSelect={onSelect}
      panelId='panel'
    />,
  );
  return { onSelect };
}

function getSelectedTab() {
  return screen.getByRole('tab', { selected: true });
}

describe('DayTabs', () => {
  it('renders a labelled tab for every day with its date', () => {
    renderTabs();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveTextContent('第 1 天');
    expect(tabs[0]).toHaveTextContent('1/1');
    expect(tabs[2]).toHaveTextContent('第 3 天');
    expect(tabs[2]).toHaveTextContent('1/3');
    expect(tabs[1]).toHaveAttribute('id', 'day-map-tab-2');
    expect(tabs[1]).toHaveAttribute('aria-controls', 'panel');
  });

  it.each([0, 1, 2])('marks the tab at index %i as selected', activeIndex => {
    renderTabs(activeIndex);

    expect(getSelectedTab()).toBe(screen.getAllByRole('tab')[activeIndex]);
  });

  it('only keeps the selected tab in the tab order', () => {
    renderTabs(1);

    expect(screen.getAllByRole('tab').map(tab => tab.tabIndex)).toEqual([
      -1, 0, -1,
    ]);
  });

  it('selects and focuses the clicked tab', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderTabs(0);

    await user.click(screen.getAllByRole('tab')[2]);

    expect(onSelect).toHaveBeenCalledWith(2);
    expect(screen.getAllByRole('tab')[2]).toHaveFocus();
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
    const { onSelect } = renderTabs(start);
    getSelectedTab().focus();

    await user.keyboard(key);

    expect(onSelect).toHaveBeenCalledWith(expected);
    expect(screen.getAllByRole('tab')[expected]).toHaveFocus();
  });

  it('ignores other keys', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderTabs(1);
    getSelectedTab().focus();

    await user.keyboard('a');

    expect(onSelect).not.toHaveBeenCalled();
  });
});
