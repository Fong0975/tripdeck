import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Modal from './Modal';

describe('Modal', () => {
  it('renders the title and children', () => {
    render(
      <Modal title='My Title' onClose={vi.fn()}>
        <p>panel content</p>
      </Modal>,
    );

    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.getByText('panel content')).toBeInTheDocument();
  });

  it('calls onClose when the overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal title='Title' onClose={onClose}>
        <p>content</p>
      </Modal>,
    );

    // The overlay backdrop is a bare decorative div with no accessible
    // role/name/text, so there is no query-by-user-facing-content option.
    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    fireEvent.click(container.querySelector('.backdrop-blur-sm')!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal title='Title' onClose={onClose}>
        <p>content</p>
      </Modal>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal title='Title' onClose={onClose}>
        <p>content</p>
      </Modal>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      description: 'no maxWidth is given',
      maxWidth: undefined,
      expected: 'max-w-md',
    },
    {
      description: 'a custom maxWidth is given',
      maxWidth: 'max-w-lg',
      expected: 'max-w-lg',
    },
  ])('applies $expected when $description', ({ maxWidth, expected }) => {
    const { container } = render(
      <Modal title='Title' onClose={vi.fn()} maxWidth={maxWidth}>
        <p>content</p>
      </Modal>,
    );

    // The panel's maxWidth class is an implementation detail with no
    // accessible query surface, so it must be read via its own class name.
    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    const panel = container.querySelector('.shadow-2xl');
    expect(panel).toHaveClass(expected);
  });

  it.each([
    {
      description: 'scrollable is not set',
      scrollable: undefined,
      expectScrollClass: false,
    },
    {
      description: 'scrollable is true',
      scrollable: true,
      expectScrollClass: true,
    },
  ])(
    'toggles scroll classes when $description',
    ({ scrollable, expectScrollClass }) => {
      const { container } = render(
        <Modal title='Title' onClose={vi.fn()} scrollable={scrollable}>
          <p>content</p>
        </Modal>,
      );

      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const panel = container.querySelector('.shadow-2xl');
      if (expectScrollClass) {
        expect(panel).toHaveClass('max-h-[90vh]', 'overflow-y-auto');
      } else {
        expect(panel).not.toHaveClass('max-h-[90vh]');
      }
    },
  );
});
