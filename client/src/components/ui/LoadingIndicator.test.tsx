import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import LoadingIndicator from './LoadingIndicator';

describe('LoadingIndicator', () => {
  it('renders the loading text', () => {
    render(<LoadingIndicator />);

    expect(screen.getByText('載入中…')).toBeInTheDocument();
  });

  it.each([
    { description: 'no className is given', className: undefined },
    { description: 'a custom className is given', className: 'my-4' },
  ])('keeps the base styling classes when $description', ({ className }) => {
    render(<LoadingIndicator className={className} />);

    const node = screen.getByText('載入中…');
    expect(node).toHaveClass('text-muted-foreground', 'animate-pulse');
    if (className) {
      expect(node).toHaveClass(className);
    }
  });
});
