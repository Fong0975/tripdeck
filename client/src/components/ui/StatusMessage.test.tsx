import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import StatusMessage from './StatusMessage';

describe('StatusMessage', () => {
  it.each([
    { variant: 'success', classNames: ['bg-primary/10', 'text-primary'] },
    { variant: 'error', classNames: ['bg-destructive/10', 'text-destructive'] },
    { variant: 'info', classNames: ['bg-muted', 'text-muted-foreground'] },
  ] as const)(
    'renders the $variant variant with its background, color, and an icon',
    ({ variant, classNames }) => {
      const { container } = render(
        <StatusMessage variant={variant}>已完成</StatusMessage>,
      );

      expect(screen.getByText('已完成')).toBeInTheDocument();
      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const message = container.querySelector('p')!;
      expect(message).toHaveClass(...classNames);
      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      expect(message.querySelector('svg')).not.toBeNull();
    },
  );
});
