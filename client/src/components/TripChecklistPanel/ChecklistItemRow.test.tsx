import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeChecklistItem } from '@/test-utils/fixtures';
import type { ChecklistItem, ChecklistOccasion } from '@/types';

import ChecklistItemRow from './ChecklistItemRow';
import type { CheckGetter } from './checkUnits';

function makeItem(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return makeChecklistItem({
    id: 10,
    name: 'Item A',
    quantity: null,
    notes: null,
    storage_location: null,
    specs: [],
    ...overrides,
  });
}

const occasions: ChecklistOccasion[] = [
  { id: 1, name: 'Occ A', checks: {}, specChecks: {} },
  { id: 2, name: 'Occ B', checks: {}, specChecks: {} },
];

function renderRow(
  item: ChecklistItem,
  getCheck: CheckGetter = () => false,
  onToggleCheck = vi.fn(),
  getSpecCheck: CheckGetter = () => false,
  onToggleSpecCheck = vi.fn(),
) {
  render(
    <table>
      <tbody>
        <ChecklistItemRow
          item={item}
          index={0}
          occasions={occasions}
          getCheck={getCheck}
          getSpecCheck={getSpecCheck}
          onToggleCheck={onToggleCheck}
          onToggleSpecCheck={onToggleSpecCheck}
        />
      </tbody>
    </table>,
  );
  return { onToggleCheck, onToggleSpecCheck };
}

const itemWithSpecs = makeItem({
  specs: [
    { id: 101, name: 'Spec A', storage_location: null },
    { id: 102, name: 'Spec B', storage_location: null },
  ],
});

describe('ChecklistItemRow', () => {
  it.each([
    { description: 'a quantity is set', quantity: 3, expected: '× 3' },
    { description: 'no quantity is set', quantity: null, expected: '些許' },
  ])('shows "$expected" when $description', ({ quantity, expected }) => {
    renderRow(makeItem({ quantity }));

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('shows notes when present', () => {
    renderRow(makeItem({ notes: 'Remember this' }));

    expect(screen.getByText('Remember this')).toBeInTheDocument();
  });

  it('shows storage badges when a storage location is set', () => {
    renderRow(makeItem({ storage_location: '託運' }));

    expect(screen.getByText('託運')).toBeInTheDocument();
  });

  it('renders without a spec list when specs is undefined', () => {
    renderRow(makeItem({ specs: undefined }));

    expect(screen.queryByText('1.')).not.toBeInTheDocument();
  });

  it('shows every spec with its index and storage badges', () => {
    renderRow(
      makeItem({
        specs: [{ id: 100, name: 'Spec A', storage_location: '隨身' }],
      }),
    );

    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('Spec A')).toBeInTheDocument();
    expect(screen.getByText('隨身')).toBeInTheDocument();
  });

  it('reflects the checked state from getCheck for each occasion', () => {
    renderRow(makeItem(), (occId, itemId) => occId === 1 && itemId === 10);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });

  it('calls onToggleCheck when a cell (outside the checkbox) is clicked', async () => {
    const user = userEvent.setup();
    const { onToggleCheck } = renderRow(makeItem());

    const checkbox = screen.getAllByRole('checkbox')[0];
    // The cell's own onClick handler is what's under test here, so it must
    // be targeted directly rather than the checkbox (which stops propagation).
    // eslint-disable-next-line testing-library/no-node-access
    const cell = checkbox.closest('td') as HTMLElement;
    await user.click(cell);

    expect(onToggleCheck).toHaveBeenCalledWith(1, 10, '');
  });

  it('calls onToggleCheck exactly once when the checkbox itself is clicked', async () => {
    const user = userEvent.setup();
    const { onToggleCheck } = renderRow(makeItem());

    await user.click(screen.getAllByRole('checkbox')[0]);

    expect(onToggleCheck).toHaveBeenCalledTimes(1);
    expect(onToggleCheck).toHaveBeenCalledWith(1, 10, '');
  });

  it('renders one extra checkbox row per spec for each occasion', () => {
    renderRow(itemWithSpecs);

    // 1 item row + 2 spec rows, each with 2 occasion checkboxes.
    expect(screen.getAllByRole('checkbox')).toHaveLength(6);
  });

  it.each([
    { description: 'no spec is checked', checked: [], expected: 'unchecked' },
    {
      description: 'some specs are checked',
      checked: [101],
      expected: 'partial',
    },
    {
      description: 'every spec is checked',
      checked: [101, 102],
      expected: 'checked',
    },
  ])(
    'shows a read-only $expected item checkbox when $description',
    ({ checked, expected }) => {
      renderRow(
        itemWithSpecs,
        () => false,
        vi.fn(),
        (occId, specId) => occId === 1 && checked.includes(specId),
      );

      const itemCheckbox = screen.getByRole('checkbox', {
        name: 'Item A - Occ A',
      });
      expect(itemCheckbox).toBeDisabled();
      if (expected === 'checked') {
        expect(itemCheckbox).toBeChecked();
      } else if (expected === 'partial') {
        expect(itemCheckbox).toBePartiallyChecked();
      } else {
        expect(itemCheckbox).not.toBeChecked();
        expect(itemCheckbox).not.toBePartiallyChecked();
      }
    },
  );

  it('ignores the own check of an item that has specs', () => {
    renderRow(itemWithSpecs, () => true);

    expect(
      screen.getByRole('checkbox', { name: 'Item A - Occ A' }),
    ).not.toBeChecked();
  });

  it('does not call onToggleCheck when the derived item checkbox is clicked', async () => {
    const user = userEvent.setup();
    const { onToggleCheck } = renderRow(itemWithSpecs);

    await user.click(screen.getByRole('checkbox', { name: 'Item A - Occ A' }));

    expect(onToggleCheck).not.toHaveBeenCalled();
  });

  it('calls onToggleSpecCheck with the occasion and spec id when a spec checkbox is clicked', async () => {
    const user = userEvent.setup();
    const { onToggleCheck, onToggleSpecCheck } = renderRow(itemWithSpecs);

    await user.click(screen.getByRole('checkbox', { name: 'Spec B - Occ B' }));

    expect(onToggleSpecCheck).toHaveBeenCalledTimes(1);
    expect(onToggleSpecCheck).toHaveBeenCalledWith(2, 102, '');
    expect(onToggleCheck).not.toHaveBeenCalled();
  });

  describe('an item without specs filed under several locations', () => {
    const multiLocationItem = makeItem({ storage_location: '託運,隨身' });

    it('renders one independently labelled row per location', () => {
      renderRow(multiLocationItem);

      expect(screen.getAllByText('Item A')).toHaveLength(2);
      expect(screen.getAllByRole('checkbox')).toHaveLength(4);
      expect(
        screen.getByRole('checkbox', { name: 'Item A（託運） - Occ A' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: 'Item A（隨身） - Occ B' }),
      ).toBeInTheDocument();
    });

    it.each([{ location: '託運' }, { location: '隨身' }])(
      'shows only the $location badge on its own row',
      ({ location }) => {
        renderRow(multiLocationItem);

        const row = screen
          .getByRole('checkbox', { name: `Item A（${location}） - Occ A` })
          // eslint-disable-next-line testing-library/no-node-access
          .closest('tr') as HTMLElement;
        const badges = within(row)
          .getAllByText(/^(託運|隨身)$/)
          .map(badge => badge.textContent);
        expect(badges).toEqual([location]);
      },
    );

    it.each([
      {
        description: 'only 託運 is checked',
        checkedLocation: '託運',
        expectedChecked: ['Item A（託運） - Occ A'],
      },
      {
        description: 'only 隨身 is checked',
        checkedLocation: '隨身',
        expectedChecked: ['Item A（隨身） - Occ A'],
      },
    ])(
      'checks just the matching row when $description',
      ({ checkedLocation, expectedChecked }) => {
        const getCheck = vi.fn<CheckGetter>(
          (occId, _itemId, location) =>
            occId === 1 && location === checkedLocation,
        );
        renderRow(multiLocationItem, getCheck);

        const checked = screen
          .getAllByRole('checkbox')
          .filter(box => (box as HTMLInputElement).checked)
          .map(box => box.getAttribute('aria-label'));
        expect(checked).toEqual(expectedChecked);
        expect(getCheck).toHaveBeenCalledWith(1, 10, '託運');
        expect(getCheck).toHaveBeenCalledWith(1, 10, '隨身');
      },
    );

    it.each([{ location: '託運' }, { location: '隨身' }])(
      'toggles only the $location check when its checkbox is clicked',
      async ({ location }) => {
        const user = userEvent.setup();
        const { onToggleCheck } = renderRow(multiLocationItem);

        await user.click(
          screen.getByRole('checkbox', {
            name: `Item A（${location}） - Occ B`,
          }),
        );

        expect(onToggleCheck).toHaveBeenCalledTimes(1);
        expect(onToggleCheck).toHaveBeenCalledWith(2, 10, location);
      },
    );
  });

  describe('an item with specs filed under several locations', () => {
    const specItem = makeItem({
      storage_location: '託運,隨身',
      specs: [{ id: 101, name: 'Spec A', storage_location: null }],
    });

    it('renders a read-only item row and one spec row per location', () => {
      renderRow(specItem);

      expect(screen.getAllByText('1.')).toHaveLength(2);
      expect(
        screen.getByRole('checkbox', { name: 'Item A - Occ A' }),
      ).toBeDisabled();
      expect(
        screen.getByRole('checkbox', { name: 'Spec A（託運） - Occ A' }),
      ).toBeEnabled();
      expect(
        screen.getByRole('checkbox', { name: 'Spec A（隨身） - Occ A' }),
      ).toBeEnabled();
    });

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
    ])('derives the item state when $description', ({ checked, expected }) => {
      renderRow(
        specItem,
        () => false,
        vi.fn(),
        (occId, _specId, location) => occId === 1 && checked.includes(location),
      );

      const itemCheckbox = screen.getByRole('checkbox', {
        name: 'Item A - Occ A',
      });
      if (expected === 'all') {
        expect(itemCheckbox).toBeChecked();
      } else if (expected === 'partial') {
        expect(itemCheckbox).toBePartiallyChecked();
      } else {
        expect(itemCheckbox).not.toBeChecked();
        expect(itemCheckbox).not.toBePartiallyChecked();
      }
    });

    it('toggles the spec check of the clicked location only', async () => {
      const user = userEvent.setup();
      const { onToggleSpecCheck } = renderRow(specItem);

      await user.click(
        screen.getByRole('checkbox', { name: 'Spec A（隨身） - Occ B' }),
      );

      expect(onToggleSpecCheck).toHaveBeenCalledTimes(1);
      expect(onToggleSpecCheck).toHaveBeenCalledWith(2, 101, '隨身');
    });
  });

  describe('spec location badges', () => {
    it.each([
      {
        description: 'a spec inheriting a single item location shows none',
        item: makeItem({
          storage_location: '託運',
          specs: [{ id: 101, name: 'Spec A', storage_location: null }],
        }),
        expectedBadgeCount: 1,
      },
      {
        description: 'a spec with its own location shows it beside its name',
        item: makeItem({
          storage_location: '託運',
          specs: [{ id: 101, name: 'Spec A', storage_location: '隨身' }],
        }),
        expectedBadgeCount: 2,
      },
    ])('$description', ({ item, expectedBadgeCount }) => {
      renderRow(item);

      expect(screen.getAllByText(/^(託運|隨身)$/)).toHaveLength(
        expectedBadgeCount,
      );
    });
  });
});
