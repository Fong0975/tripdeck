import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeChecklistItem, makeChecklistSpec } from '@/test-utils/fixtures';
import type { ChecklistOccasion } from '@/types';

import ChecklistSpecRow from './ChecklistSpecRow';
import type { CheckGetter } from './checkUnits';

const occasions: ChecklistOccasion[] = [
  { id: 1, name: 'Occ A', checks: {}, specChecks: {} },
  { id: 2, name: 'Occ B', checks: {}, specChecks: {} },
];

interface RenderOptions {
  itemLocation?: string | null;
  specLocation?: string | null;
  getSpecCheck?: CheckGetter;
  isLast?: boolean;
}

function renderRow({
  itemLocation = null,
  specLocation = '隨身',
  getSpecCheck = () => false,
  isLast = true,
}: RenderOptions = {}) {
  const onToggleSpecCheck = vi.fn();
  render(
    <table>
      <tbody>
        <ChecklistSpecRow
          item={makeChecklistItem({
            id: 10,
            name: 'Item A',
            storage_location: itemLocation,
          })}
          spec={makeChecklistSpec({
            id: 101,
            name: 'Spec A',
            storage_location: specLocation,
          })}
          specIndex={1}
          itemIndex={0}
          isLast={isLast}
          occasions={occasions}
          getSpecCheck={getSpecCheck}
          onToggleSpecCheck={onToggleSpecCheck}
        />
      </tbody>
    </table>,
  );
  return { onToggleSpecCheck };
}

/** Texts of the storage badges rendered inside the row of a checkbox. */
function badgesOfRow(checkboxName: string): (string | null)[] {
  const row = screen
    .getByRole('checkbox', { name: checkboxName })
    // eslint-disable-next-line testing-library/no-node-access
    .closest('tr') as HTMLElement;
  return within(row)
    .queryAllByText(/^(託運|隨身)$/)
    .map(badge => badge.textContent);
}

describe('ChecklistSpecRow', () => {
  describe('a spec with a single location', () => {
    it('shows the one-based index, name and its own location badge', () => {
      renderRow({ specLocation: '隨身' });

      expect(screen.getByText('2.')).toBeInTheDocument();
      expect(screen.getByText('Spec A')).toBeInTheDocument();
      expect(screen.getByText('隨身')).toBeInTheDocument();
    });

    it.each([
      {
        description: 'shows the badge of a location of its own',
        itemLocation: null,
        specLocation: '隨身',
        expectedBadges: ['隨身'],
        label: 'Spec A（隨身） - Occ A',
      },
      {
        description: 'hides the badge of a location inherited from its item',
        itemLocation: '託運',
        specLocation: null,
        expectedBadges: [],
        label: 'Spec A（託運） - Occ A',
      },
      {
        description: 'hides the badge when neither has a location',
        itemLocation: null,
        specLocation: null,
        expectedBadges: [],
        label: 'Spec A - Occ A',
      },
      {
        description: 'prefers the own location over the item location',
        itemLocation: '託運',
        specLocation: '隨身',
        expectedBadges: ['隨身'],
        label: 'Spec A（隨身） - Occ A',
      },
    ])(
      '$description',
      ({ itemLocation, specLocation, expectedBadges, label }) => {
        renderRow({ itemLocation, specLocation });

        expect(screen.getAllByRole('checkbox')).toHaveLength(2);
        expect(badgesOfRow(label)).toEqual(expectedBadges);
      },
    );

    it('reads getSpecCheck with the resolved location for each occasion', () => {
      const getSpecCheck = vi.fn<CheckGetter>(
        (occId, specId, location) =>
          occId === 1 && specId === 101 && location === '隨身',
      );
      renderRow({ specLocation: '隨身', getSpecCheck });

      expect(
        screen.getByRole('checkbox', { name: 'Spec A（隨身） - Occ A' }),
      ).toBeChecked();
      expect(
        screen.getByRole('checkbox', { name: 'Spec A（隨身） - Occ B' }),
      ).not.toBeChecked();
      expect(getSpecCheck).toHaveBeenCalledWith(1, 101, '隨身');
      expect(getSpecCheck).toHaveBeenCalledWith(2, 101, '隨身');
    });

    it.each([
      { itemLocation: null, specLocation: '託運', location: '託運' },
      { itemLocation: '隨身', specLocation: null, location: '隨身' },
      { itemLocation: null, specLocation: null, location: '' },
    ])(
      'calls onToggleSpecCheck with location "$location" (item $itemLocation, spec $specLocation)',
      async ({ itemLocation, specLocation, location }) => {
        const user = userEvent.setup();
        const { onToggleSpecCheck } = renderRow({ itemLocation, specLocation });

        const name = location
          ? `Spec A（${location}） - Occ B`
          : 'Spec A - Occ B';
        await user.click(screen.getByRole('checkbox', { name }));

        expect(onToggleSpecCheck).toHaveBeenCalledTimes(1);
        expect(onToggleSpecCheck).toHaveBeenCalledWith(2, 101, location);
      },
    );
  });

  describe.each([
    {
      description: 'a spec of its own with two locations',
      itemLocation: null,
      specLocation: '託運,隨身',
    },
    {
      description: 'a spec inheriting two item locations',
      itemLocation: '隨身,託運',
      specLocation: null,
    },
  ])('$description', ({ itemLocation, specLocation }) => {
    it('renders the name once, read-only, above one row per location', () => {
      renderRow({ itemLocation, specLocation });

      expect(screen.getAllByText('2.')).toHaveLength(1);
      expect(screen.getAllByText('Spec A')).toHaveLength(1);
      // 1 name row + 2 location rows, each with 2 occasion checkboxes.
      expect(screen.getAllByRole('checkbox')).toHaveLength(6);
      expect(
        screen.getByRole('checkbox', { name: 'Spec A - Occ A' }),
      ).toBeDisabled();
      expect(
        screen.getByRole('checkbox', { name: 'Spec A（託運） - Occ A' }),
      ).toBeEnabled();
      expect(
        screen.getByRole('checkbox', { name: 'Spec A（隨身） - Occ A' }),
      ).toBeEnabled();
    });

    it.each([
      { rowName: 'Spec A - Occ A', expected: [] },
      { rowName: 'Spec A（託運） - Occ A', expected: ['託運'] },
      { rowName: 'Spec A（隨身） - Occ A', expected: ['隨身'] },
    ])(
      'shows the badges $expected on the row of "$rowName"',
      ({ rowName, expected }) => {
        renderRow({ itemLocation, specLocation });

        expect(badgesOfRow(rowName)).toEqual(expected);
      },
    );

    it.each([
      { description: 'no location is checked', checked: [], expected: 'none' },
      {
        description: 'one location is checked',
        checked: ['託運'],
        expected: 'partial',
      },
      {
        description: 'every location is checked',
        checked: ['託運', '隨身'],
        expected: 'all',
      },
    ])(
      'derives the name row state when $description',
      ({ checked, expected }) => {
        renderRow({
          itemLocation,
          specLocation,
          getSpecCheck: (occId, _specId, location) =>
            occId === 1 && checked.includes(location),
        });

        const nameCheckbox = screen.getByRole('checkbox', {
          name: 'Spec A - Occ A',
        });
        if (expected === 'all') {
          expect(nameCheckbox).toBeChecked();
        } else if (expected === 'partial') {
          expect(nameCheckbox).toBePartiallyChecked();
        } else {
          expect(nameCheckbox).not.toBeChecked();
          expect(nameCheckbox).not.toBePartiallyChecked();
        }
      },
    );

    it.each([{ location: '託運' }, { location: '隨身' }])(
      'toggles only the $location check when its checkbox is clicked',
      async ({ location }) => {
        const user = userEvent.setup();
        const { onToggleSpecCheck } = renderRow({ itemLocation, specLocation });

        await user.click(
          screen.getByRole('checkbox', {
            name: `Spec A（${location}） - Occ B`,
          }),
        );

        expect(onToggleSpecCheck).toHaveBeenCalledTimes(1);
        expect(onToggleSpecCheck).toHaveBeenCalledWith(2, 101, location);
      },
    );

    it('does not toggle anything when the read-only name row is clicked', async () => {
      const user = userEvent.setup();
      const { onToggleSpecCheck } = renderRow({ itemLocation, specLocation });

      await user.click(
        screen.getByRole('checkbox', { name: 'Spec A - Occ A' }),
      );

      expect(onToggleSpecCheck).not.toHaveBeenCalled();
    });
  });

  it.each([
    { isLast: true, lastRowBorder: 'border-border' },
    { isLast: false, lastRowBorder: 'border-border/40' },
  ])(
    'closes the item border on the last location row only when isLast is $isLast',
    ({ isLast, lastRowBorder }) => {
      renderRow({ specLocation: '託運,隨身', isLast });

      const rows = screen
        .getAllByRole('checkbox')
        // eslint-disable-next-line testing-library/no-node-access
        .map(box => box.closest('tr') as HTMLElement);
      const lastRow = rows[rows.length - 1];
      const nameRow = rows[0];
      expect(lastRow.className).toContain(` ${lastRowBorder} `);
      expect(nameRow.className).toContain('border-border/40');
    },
  );
});
