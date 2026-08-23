import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import StorageBadges from './StorageBadges';

describe('StorageBadges', () => {
  it.each([
    { description: 'the value is null', value: null },
    { description: 'the value is an empty string', value: '' },
    { description: 'the value matches no known option', value: 'unknown' },
  ])('renders nothing when $description', ({ value }) => {
    const { container } = render(<StorageBadges value={value} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders a badge for a single matching option', () => {
    render(<StorageBadges value='託運' />);

    expect(screen.getByText('託運')).toBeInTheDocument();
    expect(screen.queryByText('隨身')).not.toBeInTheDocument();
  });

  it('renders a badge for every matching option', () => {
    render(<StorageBadges value='託運,隨身' />);

    expect(screen.getByText('託運')).toBeInTheDocument();
    expect(screen.getByText('隨身')).toBeInTheDocument();
  });
});
