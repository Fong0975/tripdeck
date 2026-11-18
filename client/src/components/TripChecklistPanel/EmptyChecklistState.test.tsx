import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import EmptyChecklistState from './EmptyChecklistState';

describe('EmptyChecklistState', () => {
  it.each([
    { syncing: false, label: '從範本同步', disabled: false },
    { syncing: true, label: '同步中…', disabled: true },
  ])(
    'shows "$label" with disabled=$disabled when syncing=$syncing',
    ({ syncing, label, disabled }) => {
      render(
        <EmptyChecklistState
          syncing={syncing}
          onSyncTemplate={vi.fn()}
          onEdit={vi.fn()}
        />,
      );

      const buttons = [
        screen.getByRole('button', { name: label }),
        screen.getByRole('button', { name: '編輯清單' }),
      ];
      for (const button of buttons) {
        if (disabled) {
          expect(button).toBeDisabled();
        } else {
          expect(button).toBeEnabled();
        }
      }
    },
  );

  it('invokes the matching callback for each button', async () => {
    const onSyncTemplate = vi.fn();
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(
      <EmptyChecklistState
        syncing={false}
        onSyncTemplate={onSyncTemplate}
        onEdit={onEdit}
      />,
    );

    await user.click(screen.getByText('從範本同步'));
    await user.click(screen.getByText('編輯清單'));

    expect(onSyncTemplate).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
