import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ChecklistOccasion } from '@/types';

import OccasionFilter from './OccasionFilter';

const occasions: ChecklistOccasion[] = [
  { id: 1, name: 'Out', checks: {}, specChecks: {} },
  { id: 2, name: 'Back', checks: {}, specChecks: {} },
];

function renderFilter(list: ChecklistOccasion[], hidden: number[] = []) {
  const onToggle = vi.fn();
  render(
    <OccasionFilter
      occasions={list}
      hidden={new Set(hidden)}
      onToggle={onToggle}
    />,
  );
  return { onToggle };
}

describe('OccasionFilter', () => {
  it.each([
    { name: 'no occasion', list: [] },
    { name: 'a single occasion', list: occasions.slice(0, 1) },
  ])('renders nothing for $name', ({ list }) => {
    renderFilter(list);

    expect(
      screen.queryByRole('group', { name: '檢查時機' }),
    ).not.toBeInTheDocument();
  });

  it.each([
    {
      name: 'checks all by default',
      hidden: [] as number[],
      out: true,
      back: true,
    },
    { name: 'unchecks a hidden occasion', hidden: [2], out: true, back: false },
  ])('$name', ({ hidden, out, back }) => {
    renderFilter(occasions, hidden);

    for (const [name, checked] of [
      ['Out', out],
      ['Back', back],
    ] as const) {
      const box = screen.getByRole('checkbox', { name });
      if (checked) {
        expect(box).toBeChecked();
      } else {
        expect(box).not.toBeChecked();
      }
    }
  });

  it('keeps the last shown occasion checked and disabled', () => {
    renderFilter(occasions, [2]);

    expect(screen.getByRole('checkbox', { name: 'Out' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Back' })).toBeEnabled();
  });

  it('keeps every box usable while all are shown', () => {
    renderFilter(occasions);

    expect(screen.getByRole('checkbox', { name: 'Out' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'Back' })).toBeEnabled();
  });

  it('reports the toggled occasion', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderFilter(occasions);

    await user.click(screen.getByRole('checkbox', { name: 'Back' }));

    expect(onToggle).toHaveBeenCalledWith(2);
  });
});
