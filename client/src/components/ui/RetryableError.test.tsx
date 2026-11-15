import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import RetryableError from './RetryableError';

describe('RetryableError', () => {
  it.each([
    { name: 'without extra classes', className: undefined },
    { name: 'with extra container classes', className: 'min-h-screen' },
  ])(
    'shows the message and calls onRetry when retry is clicked $name',
    async ({ className }) => {
      const onRetry = vi.fn();
      const user = userEvent.setup();
      render(
        <RetryableError
          message='載入失敗'
          onRetry={onRetry}
          className={className}
        />,
      );

      expect(screen.getByText('載入失敗')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '重試' }));

      expect(onRetry).toHaveBeenCalledTimes(1);
    },
  );
});
