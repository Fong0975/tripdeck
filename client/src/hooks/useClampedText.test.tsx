import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { mockElementOverflow } from '@/test-utils/dom';

import { useClampedText } from './useClampedText';

function TestComponent({ text }: { text: string | null | undefined }) {
  const { ref, expanded, clamped, toggle } = useClampedText(text);
  return (
    <div>
      <div ref={ref} data-testid='target'>
        {text}
      </div>
      <span data-testid='clamped'>{String(clamped)}</span>
      <span data-testid='expanded'>{String(expanded)}</span>
      <button onClick={toggle}>toggle</button>
    </div>
  );
}

let restoreOverflow: (() => void) | undefined;

function stubHeights(scrollHeight: number, clientHeight: number) {
  restoreOverflow = mockElementOverflow({ scrollHeight, clientHeight });
}

afterEach(() => {
  restoreOverflow?.();
});

describe('useClampedText', () => {
  it.each([
    {
      description: 'content overflows the container',
      scrollHeight: 100,
      clientHeight: 40,
      expected: true,
    },
    {
      description: 'content exactly fits the container',
      scrollHeight: 40,
      clientHeight: 40,
      expected: false,
    },
    {
      description: 'content is shorter than the container',
      scrollHeight: 20,
      clientHeight: 40,
      expected: false,
    },
  ])(
    'sets clamped to $expected when $description',
    ({ scrollHeight, clientHeight, expected }) => {
      stubHeights(scrollHeight, clientHeight);

      render(<TestComponent text='hello' />);

      expect(screen.getByTestId('clamped')).toHaveTextContent(String(expected));
    },
  );

  it('recomputes clamped when the text changes', () => {
    stubHeights(100, 40);
    const { rerender } = render(<TestComponent text='short' />);
    expect(screen.getByTestId('clamped')).toHaveTextContent('true');

    stubHeights(20, 40);
    rerender(<TestComponent text='a different, longer piece of text' />);

    expect(screen.getByTestId('clamped')).toHaveTextContent('false');
  });

  it('toggles expanded state each time toggle is called', () => {
    stubHeights(40, 40);
    render(<TestComponent text='hello' />);
    expect(screen.getByTestId('expanded')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('expanded')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('expanded')).toHaveTextContent('false');
  });
});
