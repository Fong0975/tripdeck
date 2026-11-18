import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ChecklistOccasion } from '@/types';

import ChecklistLocationRow from './ChecklistLocationRow';

const occasions: ChecklistOccasion[] = [
  { id: 1, name: 'Occ A', checks: {}, specChecks: {} },
  { id: 2, name: 'Occ B', checks: {}, specChecks: {} },
];

interface RenderOptions {
  name?: string;
  location?: string;
  depth?: 1 | 2;
  isLast?: boolean;
  itemIndex?: number;
  isChecked?: (occId: number) => boolean;
}

function renderRow({
  name = 'Item A',
  location = '託運',
  depth = 1,
  isLast = false,
  itemIndex = 0,
  isChecked = () => false,
}: RenderOptions = {}) {
  const onToggle = vi.fn();
  render(
    <table>
      <tbody>
        <ChecklistLocationRow
          name={name}
          location={location}
          depth={depth}
          isLast={isLast}
          itemIndex={itemIndex}
          occasions={occasions}
          isChecked={isChecked}
          onToggle={onToggle}
        />
      </tbody>
    </table>,
  );
  return { onToggle };
}

describe('ChecklistLocationRow', () => {
  it.each([
    { location: '託運', expectedBadges: ['託運'] },
    { location: '隨身', expectedBadges: ['隨身'] },
    { location: '', expectedBadges: [] },
  ])(
    'shows the badges $expectedBadges for location "$location"',
    ({ location, expectedBadges }) => {
      renderRow({ location });

      expect(
        screen.queryAllByText(/^(託運|隨身)$/).map(badge => badge.textContent),
      ).toEqual(expectedBadges);
    },
  );

  it.each([
    { name: 'Item A', location: '託運', label: 'Item A（託運） - Occ A' },
    { name: 'Spec B', location: '隨身', label: 'Spec B（隨身） - Occ A' },
    { name: 'Item A', location: '', label: 'Item A - Occ A' },
  ])('names the first checkbox "$label"', ({ name, location, label }) => {
    renderRow({ name, location });

    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: label })).toBeEnabled();
  });

  it('reflects isChecked for each occasion', () => {
    const isChecked = vi.fn((occId: number) => occId === 2);
    renderRow({ isChecked });

    expect(
      screen.getByRole('checkbox', { name: 'Item A（託運） - Occ A' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Item A（託運） - Occ B' }),
    ).toBeChecked();
    expect(isChecked).toHaveBeenCalledWith(1);
    expect(isChecked).toHaveBeenCalledWith(2);
  });

  it.each([
    { occId: 1, occName: 'Occ A' },
    { occId: 2, occName: 'Occ B' },
  ])(
    'calls onToggle with occasion $occId when its checkbox is clicked',
    async ({ occId, occName }) => {
      const user = userEvent.setup();
      const { onToggle } = renderRow();

      await user.click(
        screen.getByRole('checkbox', { name: `Item A（託運） - ${occName}` }),
      );

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith(occId);
    },
  );

  it.each([
    { depth: 1 as const, expectedIndent: 'sm:pl-8', otherIndent: 'sm:pl-14' },
    { depth: 2 as const, expectedIndent: 'sm:pl-14', otherIndent: 'sm:pl-8' },
  ])(
    'indents the name cell for depth $depth',
    ({ depth, expectedIndent, otherIndent }) => {
      renderRow({ depth });

      const cell = screen
        .getByRole('checkbox', { name: 'Item A（託運） - Occ A' })
        // eslint-disable-next-line testing-library/no-node-access
        .closest('tr')?.firstElementChild as HTMLElement;
      expect(cell.className).toContain(expectedIndent);
      expect(cell.className).not.toContain(otherIndent);
    },
  );

  it.each([
    { isLast: true, itemIndex: 0, border: ' border-border ', striped: false },
    { isLast: false, itemIndex: 1, border: 'border-border/40', striped: true },
  ])(
    'styles the row for isLast=$isLast and itemIndex=$itemIndex',
    ({ isLast, itemIndex, border, striped }) => {
      renderRow({ isLast, itemIndex });

      const row = screen
        .getByRole('checkbox', { name: 'Item A（託運） - Occ A' })
        // eslint-disable-next-line testing-library/no-node-access
        .closest('tr') as HTMLElement;
      expect(row.className).toContain(border);
      expect(row.className.includes('bg-muted/10')).toBe(striped);
    },
  );
});
