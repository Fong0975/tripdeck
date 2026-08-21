import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders the title and message', () => {
    render(
      <ConfirmDialog
        title='Delete trip?'
        message='This cannot be undone.'
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('Delete trip?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it.each([
    {
      description: 'no labels are given',
      props: {},
      expectedCancel: '取消',
      expectedConfirm: '確定',
    },
    {
      description: 'custom labels are given',
      props: { cancelLabel: 'Nope', confirmLabel: 'Yes, delete' },
      expectedCancel: 'Nope',
      expectedConfirm: 'Yes, delete',
    },
  ])(
    'renders $expectedCancel/$expectedConfirm when $description',
    ({ props, expectedCancel, expectedConfirm }) => {
      render(
        <ConfirmDialog
          title='T'
          message='M'
          onCancel={vi.fn()}
          onConfirm={vi.fn()}
          {...props}
        />,
      );

      expect(screen.getByText(expectedCancel)).toBeInTheDocument();
      expect(screen.getByText(expectedConfirm)).toBeInTheDocument();
    },
  );

  it.each([
    {
      description: 'clicking cancel calls onCancel',
      label: '取消',
      which: 'cancel' as const,
    },
    {
      description: 'clicking confirm calls onConfirm',
      label: '確定',
      which: 'confirm' as const,
    },
  ])('$description', async ({ label, which }) => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        title='T'
        message='M'
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByText(label));

    if (which === 'cancel') {
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    } else {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    }
  });
});
