import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { FilterGroup } from './checklistFilter';
import ChecklistFilterList from './ChecklistFilterList';

const clothes: FilterGroup = {
  key: '1',
  label: 'Clothes',
  items: [
    { id: 10, name: 'Jacket' },
    { id: 11, name: 'Shirt' },
  ],
};
const gadgets: FilterGroup = {
  key: '2',
  label: 'Gadgets',
  items: [{ id: 20, name: 'Charger' }],
};
const empty: FilterGroup = { key: '3', label: 'Empty', items: [] };

function renderList(groups: FilterGroup[], hidden: string[] = []) {
  const onToggleItem = vi.fn();
  const onToggleGroup = vi.fn();
  render(
    <ChecklistFilterList
      groups={groups}
      hidden={new Set(hidden)}
      onToggleItem={onToggleItem}
      onToggleGroup={onToggleGroup}
    />,
  );
  return { onToggleItem, onToggleGroup };
}

describe('ChecklistFilterList', () => {
  it('shows a message when there is nothing to filter', () => {
    renderList([empty]);

    expect(screen.getByText('沒有可篩選的項目')).toBeInTheDocument();
  });

  it('lists the groups with items and skips empty groups', () => {
    renderList([clothes, gadgets, empty]);

    expect(screen.getByRole('group', { name: 'Clothes' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Gadgets' })).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'Empty' }),
    ).not.toBeInTheDocument();
  });

  it.each([
    {
      name: 'checks everything when nothing is hidden',
      hidden: [] as string[],
      group: 'checked',
      jacket: true,
      shirt: true,
    },
    {
      name: 'marks the group as partial when one item is hidden',
      hidden: ['10|1'],
      group: 'partial',
      jacket: false,
      shirt: true,
    },
    {
      name: 'unchecks everything when all items are hidden',
      hidden: ['10|1', '11|1'],
      group: 'unchecked',
      jacket: false,
      shirt: false,
    },
    {
      name: 'ignores items hidden in another group',
      hidden: ['10|2'],
      group: 'checked',
      jacket: true,
      shirt: true,
    },
  ])('$name', ({ hidden, group, jacket, shirt }) => {
    renderList([clothes], hidden);
    const section = within(screen.getByRole('group', { name: 'Clothes' }));

    const groupBox = section.getByRole('checkbox', {
      name: 'Clothes（全部項目）',
    });
    if (group === 'checked') {
      expect(groupBox).toBeChecked();
    } else if (group === 'partial') {
      expect(groupBox).toBePartiallyChecked();
    } else {
      expect(groupBox).not.toBeChecked();
      expect(groupBox).not.toBePartiallyChecked();
    }
    for (const [name, checked] of [
      ['Jacket', jacket],
      ['Shirt', shirt],
    ] as const) {
      const itemBox = section.getByRole('checkbox', { name });
      if (checked) {
        expect(itemBox).toBeChecked();
      } else {
        expect(itemBox).not.toBeChecked();
      }
    }
  });

  it('reports the toggled item with its group key', async () => {
    const user = userEvent.setup();
    const { onToggleItem, onToggleGroup } = renderList([clothes, gadgets]);

    await user.click(screen.getByRole('checkbox', { name: 'Charger' }));

    expect(onToggleItem).toHaveBeenCalledWith('2', 20);
    expect(onToggleGroup).not.toHaveBeenCalled();
  });

  it('reports the toggled group', async () => {
    const user = userEvent.setup();
    const { onToggleItem, onToggleGroup } = renderList([clothes, gadgets]);

    await user.click(
      screen.getByRole('checkbox', { name: 'Clothes（全部項目）' }),
    );

    expect(onToggleGroup).toHaveBeenCalledWith(clothes);
    expect(onToggleItem).not.toHaveBeenCalled();
  });
});
