import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DiscardChangesDialog from './DiscardChangesDialog';

describe('DiscardChangesDialog', () => {
  it('renders the discard warning', () => {
    render(<DiscardChangesDialog onCancel={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByText('確定要關閉嗎？')).toBeInTheDocument();
    expect(screen.getByText('尚未儲存的變更將會遺失。')).toBeInTheDocument();
  });

  it.each([
    { label: '取消', expectedCancel: 1, expectedConfirm: 0 },
    { label: '確定', expectedCancel: 0, expectedConfirm: 1 },
  ])(
    'clicking $label calls the matching handler',
    async ({ label, expectedCancel, expectedConfirm }) => {
      const onCancel = vi.fn();
      const onConfirm = vi.fn();
      const user = userEvent.setup();
      render(
        <DiscardChangesDialog onCancel={onCancel} onConfirm={onConfirm} />,
      );

      await user.click(screen.getByRole('button', { name: label }));

      expect(onCancel).toHaveBeenCalledTimes(expectedCancel);
      expect(onConfirm).toHaveBeenCalledTimes(expectedConfirm);
    },
  );
});
