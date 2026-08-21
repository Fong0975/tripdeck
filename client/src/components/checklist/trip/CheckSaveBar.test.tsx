import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CheckSaveBar from './CheckSaveBar';

describe('CheckSaveBar', () => {
  it.each([
    { saving: false, expectedSaveLabel: '儲存', disabled: false },
    { saving: true, expectedSaveLabel: '儲存中…', disabled: true },
  ])(
    'shows "$expectedSaveLabel" and disabled=$disabled when saving=$saving',
    ({ saving, expectedSaveLabel, disabled }) => {
      render(
        <CheckSaveBar saving={saving} onSave={vi.fn()} onDiscard={vi.fn()} />,
      );

      const saveButton = screen.getByText(expectedSaveLabel);
      const discardButton = screen.getByText('放棄');
      if (disabled) {
        expect(saveButton).toBeDisabled();
        expect(discardButton).toBeDisabled();
      } else {
        expect(saveButton).toBeEnabled();
        expect(discardButton).toBeEnabled();
      }
    },
  );

  it('calls onSave when the save button is clicked', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<CheckSaveBar saving={false} onSave={onSave} onDiscard={vi.fn()} />);

    await user.click(screen.getByText('儲存'));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onDiscard when the discard button is clicked', async () => {
    const onDiscard = vi.fn();
    const user = userEvent.setup();
    render(
      <CheckSaveBar saving={false} onSave={vi.fn()} onDiscard={onDiscard} />,
    );

    await user.click(screen.getByText('放棄'));

    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
