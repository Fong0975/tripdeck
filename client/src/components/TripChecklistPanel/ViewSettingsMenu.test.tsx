import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { FilterGroup } from './checklistFilter';
import type { ViewMode } from './viewMode';
import ViewSettingsMenu from './ViewSettingsMenu';

const groups: FilterGroup[] = [
  {
    key: '1',
    label: 'Clothes',
    items: [
      { id: 10, name: 'Jacket' },
      { id: 11, name: 'Shirt' },
    ],
  },
];

function renderMenu(
  options: {
    hidden?: string[];
    viewMode?: ViewMode;
    incompleteOnly?: boolean;
  } = {},
) {
  const handlers = {
    onViewModeChange: vi.fn(),
    onIncompleteOnlyChange: vi.fn(),
    onToggleItem: vi.fn(),
    onToggleGroup: vi.fn(),
    onClearFilter: vi.fn(),
  };
  render(
    <ViewSettingsMenu
      viewMode={options.viewMode ?? 'category'}
      groups={groups}
      hidden={new Set(options.hidden ?? [])}
      incompleteOnly={options.incompleteOnly ?? false}
      {...handlers}
    />,
  );
  return handlers;
}

async function openMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /檢視設定/ }));
  return user;
}

describe('ViewSettingsMenu', () => {
  it('keeps the panel closed until the button is clicked', async () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: /檢視設定/ });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('檢視方式')).not.toBeInTheDocument();

    await openMenu();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('檢視方式')).toBeInTheDocument();
    expect(screen.getByText('篩選項目')).toBeInTheDocument();
  });

  it.each([
    { hidden: [] as string[], badge: null },
    { hidden: ['10|1'], badge: '已隱藏 1' },
    { hidden: ['10|1', '11|1'], badge: '已隱藏 2' },
    { hidden: ['99|1'], badge: null },
  ])('shows badge $badge for hidden $hidden', ({ hidden, badge }) => {
    renderMenu({ hidden });

    if (badge) {
      expect(screen.getByText(badge)).toBeInTheDocument();
    } else {
      expect(screen.queryByText(/已隱藏/)).not.toBeInTheDocument();
    }
  });

  it.each<{ viewMode: ViewMode; label: string; expected: ViewMode }>([
    { viewMode: 'category', label: '依存放位置', expected: 'storage' },
    { viewMode: 'storage', label: '依分類', expected: 'category' },
  ])(
    'switches the view to $expected from the panel',
    async ({ viewMode, label, expected }) => {
      const { onViewModeChange } = renderMenu({ viewMode });
      const user = await openMenu();

      await user.click(screen.getByRole('button', { name: label }));

      expect(onViewModeChange).toHaveBeenCalledWith(expected);
    },
  );

  it('forwards item and group toggles', async () => {
    const { onToggleItem, onToggleGroup } = renderMenu();
    const user = await openMenu();

    await user.click(screen.getByRole('checkbox', { name: 'Shirt' }));
    await user.click(
      screen.getByRole('checkbox', { name: 'Clothes（全部項目）' }),
    );

    expect(onToggleItem).toHaveBeenCalledWith('1', 11);
    expect(onToggleGroup).toHaveBeenCalledWith(groups[0]);
  });

  it.each([
    { hidden: [] as string[], enabled: false },
    { hidden: ['10|1'], enabled: true },
  ])(
    'enables the clear button only while items are hidden ($hidden)',
    async ({ hidden, enabled }) => {
      const { onClearFilter } = renderMenu({ hidden });
      const user = await openMenu();
      const clear = screen.getByRole('button', { name: '清除篩選' });

      if (enabled) {
        expect(clear).toBeEnabled();
      } else {
        expect(clear).toBeDisabled();
      }
      await user.click(clear);

      expect(onClearFilter).toHaveBeenCalledTimes(enabled ? 1 : 0);
    },
  );

  it('closes the panel with Escape', async () => {
    renderMenu();
    const user = await openMenu();

    await user.keyboard('{Escape}');

    expect(screen.queryByText('檢視方式')).not.toBeInTheDocument();
  });
  it.each([
    { incompleteOnly: false, expected: false },
    { incompleteOnly: true, expected: true },
  ])(
    'shows the unfinished-only option as checked=$expected',
    async ({ incompleteOnly, expected }) => {
      renderMenu({ incompleteOnly });
      await openMenu();

      const option = screen.getByRole('checkbox', {
        name: '僅顯示未完成的項目',
      });

      if (expected) {
        expect(option).toBeChecked();
      } else {
        expect(option).not.toBeChecked();
      }
    },
  );

  it.each([
    { incompleteOnly: false, checked: true },
    { incompleteOnly: true, checked: false },
  ])(
    'reports $checked when the unfinished-only option is clicked while it is $incompleteOnly',
    async ({ incompleteOnly, checked }) => {
      const { onIncompleteOnlyChange } = renderMenu({ incompleteOnly });
      const user = await openMenu();

      await user.click(
        screen.getByRole('checkbox', { name: '僅顯示未完成的項目' }),
      );

      expect(onIncompleteOnlyChange).toHaveBeenCalledWith(checked);
    },
  );

  it('keeps the item filter usable while unfinished-only is on', async () => {
    const { onToggleItem, onClearFilter } = renderMenu({
      incompleteOnly: true,
      hidden: ['10|1'],
    });
    const user = await openMenu();

    expect(screen.getByRole('checkbox', { name: 'Shirt' })).toBeEnabled();
    expect(
      screen.getByRole('checkbox', { name: 'Clothes（全部項目）' }),
    ).toBeEnabled();
    await user.click(screen.getByRole('checkbox', { name: 'Shirt' }));
    await user.click(screen.getByRole('button', { name: '清除篩選' }));

    expect(onToggleItem).toHaveBeenCalledWith('1', 11);
    expect(onClearFilter).toHaveBeenCalledTimes(1);
  });

  it.each([
    { incompleteOnly: true, hidden: [] as string[], badges: ['僅未完成'] },
    { incompleteOnly: false, hidden: ['10|1'], badges: ['已隱藏 1'] },
    {
      incompleteOnly: true,
      hidden: ['10|1'],
      badges: ['僅未完成', '已隱藏 1'],
    },
  ])('shows the badges $badges', ({ incompleteOnly, hidden, badges }) => {
    renderMenu({ incompleteOnly, hidden });

    for (const badge of badges) {
      expect(screen.getByText(badge)).toBeInTheDocument();
    }
  });
});
