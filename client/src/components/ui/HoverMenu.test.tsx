import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import HoverMenu, { type HoverMenuItem } from './HoverMenu';

function mountMenu(items: HoverMenuItem[], align?: 'left' | 'right') {
  return render(
    <HoverMenu ariaLabel='選單' trigger='開啟' items={items} align={align} />,
  );
}

// The dropdown is shown by CSS (group-hover / group-focus-within), which
// jsdom does not evaluate, so these tests cover structure and behavior only.
describe('HoverMenu', () => {
  it('renders a trigger that announces a menu', () => {
    mountMenu([]);

    const trigger = screen.getByRole('button', { name: '選單' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveTextContent('開啟');
  });

  it('lists every item as a menu item', () => {
    mountMenu([
      { label: '甲', onSelect: vi.fn() },
      { label: '乙', onSelect: vi.fn() },
    ]);

    expect(
      screen.getAllByRole('menuitem').map(item => item.textContent),
    ).toEqual(['甲', '乙']);
  });

  it('calls only the chosen item and releases focus', async () => {
    const user = userEvent.setup();
    const first = vi.fn();
    const second = vi.fn();
    mountMenu([
      { label: '甲', onSelect: first },
      { label: '乙', onSelect: second },
    ]);
    const entry = screen.getByRole('menuitem', { name: '乙' });

    await user.click(entry);

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(entry).not.toHaveFocus();
  });

  it.each([
    { disabled: true, expectedDisabled: true },
    { disabled: false, expectedDisabled: false },
    { disabled: undefined, expectedDisabled: false },
  ])(
    'sets disabled=$expectedDisabled for disabled=$disabled',
    ({ disabled, expectedDisabled }) => {
      mountMenu([{ label: '甲', onSelect: vi.fn(), disabled }]);

      const entry = screen.getByRole('menuitem', { name: '甲' });
      if (expectedDisabled) {
        expect(entry).toBeDisabled();
      } else {
        expect(entry).toBeEnabled();
      }
    },
  );

  it('does not call a disabled item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    mountMenu([{ label: '甲', onSelect, disabled: true }]);

    await user.click(screen.getByRole('menuitem', { name: '甲' }));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('applies an item title', () => {
    mountMenu([{ label: '甲', onSelect: vi.fn(), title: '說明' }]);

    expect(screen.getByTitle('說明')).toBe(
      screen.getByRole('menuitem', { name: '甲' }),
    );
  });

  it.each([
    { align: undefined, expected: 'right-0' },
    { align: 'right' as const, expected: 'right-0' },
    { align: 'left' as const, expected: 'left-0' },
  ])(
    'aligns the dropdown with $expected for align=$align',
    ({ align, expected }) => {
      mountMenu([{ label: '甲', onSelect: vi.fn() }], align);

      expect(screen.getByTestId('hover-menu-dropdown')).toHaveClass(expected);
    },
  );
});
