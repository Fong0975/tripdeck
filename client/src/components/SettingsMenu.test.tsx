import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import SettingsMenu from './SettingsMenu';

function renderMenu(onImportExport = vi.fn()) {
  render(<SettingsMenu onImportExport={onImportExport} />);
  return { onImportExport };
}

// The dropdown is shown by CSS (group-hover / group-focus-within), which
// jsdom does not evaluate, so these tests cover structure and behavior only.
describe('SettingsMenu', () => {
  it('renders a settings button that announces a menu', () => {
    renderMenu();

    expect(screen.getByRole('button', { name: '設定' })).toHaveAttribute(
      'aria-haspopup',
      'menu',
    );
  });

  it('lists the import/export entry in the menu', () => {
    renderMenu();

    expect(
      screen.getByRole('menuitem', { name: '匯入 / 匯出' }),
    ).toBeInTheDocument();
  });

  it('calls onImportExport once when the entry is chosen', async () => {
    const user = userEvent.setup();
    const { onImportExport } = renderMenu();

    await user.click(screen.getByRole('menuitem', { name: '匯入 / 匯出' }));

    expect(onImportExport).toHaveBeenCalledTimes(1);
  });

  it('releases focus after a choice so the dropdown closes', async () => {
    const user = userEvent.setup();
    renderMenu();
    const entry = screen.getByRole('menuitem', { name: '匯入 / 匯出' });

    await user.click(entry);

    expect(entry).not.toHaveFocus();
  });
});
