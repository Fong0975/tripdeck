import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ModalFooterActions from './ModalFooterActions';

describe('ModalFooterActions', () => {
  it.each([
    {
      description: 'no labels are given',
      props: {},
      expectedCancel: '取消',
      expectedSubmit: '儲存',
    },
    {
      description: 'custom labels are given',
      props: { cancelLabel: 'Back', submitLabel: 'Create' },
      expectedCancel: 'Back',
      expectedSubmit: 'Create',
    },
  ])(
    'renders $expectedCancel/$expectedSubmit when $description',
    ({ props, expectedCancel, expectedSubmit }) => {
      render(<ModalFooterActions onCancel={vi.fn()} {...props} />);

      expect(screen.getByText(expectedCancel)).toBeInTheDocument();
      expect(screen.getByText(expectedSubmit)).toBeInTheDocument();
    },
  );

  it('calls onCancel when the cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<ModalFooterActions onCancel={onCancel} />);

    await user.click(screen.getByText('取消'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('submits the parent form when the submit button is clicked', async () => {
    const onSubmit = vi.fn(e => e.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <ModalFooterActions onCancel={vi.fn()} />
      </form>,
    );

    await user.click(screen.getByText('儲存'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      description: 'disabled is true',
      props: { disabled: true },
      expectedLabel: '儲存',
    },
    {
      description: 'submitting is true',
      props: { submitting: true },
      expectedLabel: '儲存中…',
    },
    {
      description: 'submitting is true with a custom submitting label',
      props: { submitting: true, submittingLabel: '建立中…' },
      expectedLabel: '建立中…',
    },
  ])(
    'disables the submit button and blocks submission when $description',
    async ({ props, expectedLabel }) => {
      const onSubmit = vi.fn(e => e.preventDefault());
      const user = userEvent.setup();
      render(
        <form onSubmit={onSubmit}>
          <ModalFooterActions onCancel={vi.fn()} {...props} />
        </form>,
      );

      expect(screen.getByText(expectedLabel)).toBeDisabled();
      await user.click(screen.getByText(expectedLabel));

      expect(onSubmit).not.toHaveBeenCalled();
    },
  );
});
