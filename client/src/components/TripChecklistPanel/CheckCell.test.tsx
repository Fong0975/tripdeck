import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CheckCell from './CheckCell';
import type { CheckState } from './checkProgress';

function mountCell(state: CheckState, onToggle?: () => void) {
  render(
    <table>
      <tbody>
        <tr>
          <CheckCell state={state} label='Item - Occ' onToggle={onToggle} />
        </tr>
      </tbody>
    </table>,
  );
  return screen.getByRole('checkbox', { name: 'Item - Occ' });
}

describe('CheckCell', () => {
  it.each([
    { state: 'checked' as const, checked: true, partial: false },
    { state: 'partial' as const, checked: false, partial: true },
    { state: 'unchecked' as const, checked: false, partial: false },
  ])(
    'reflects the $state state on the checkbox',
    ({ state, checked, partial }) => {
      const checkbox = mountCell(state, vi.fn());

      if (checked) {
        expect(checkbox).toBeChecked();
      } else {
        expect(checkbox).not.toBeChecked();
      }
      if (partial) {
        expect(checkbox).toBePartiallyChecked();
      } else {
        expect(checkbox).not.toBePartiallyChecked();
      }
    },
  );

  it('is read-only and never toggles when onToggle is omitted', async () => {
    const user = userEvent.setup();
    const checkbox = mountCell('unchecked');

    await user.click(checkbox);

    expect(checkbox).toBeDisabled();
    expect(checkbox).not.toBeChecked();
  });

  it('calls onToggle once when the checkbox itself is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const checkbox = mountCell('unchecked', onToggle);

    await user.click(checkbox);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle when the cell outside the checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const checkbox = mountCell('unchecked', onToggle);

    // The cell's own onClick is under test, so target it directly.
    // eslint-disable-next-line testing-library/no-node-access
    await user.click(checkbox.closest('td') as HTMLElement);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
