import { fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { showToast } from './toast';

vi.mock('sonner', () => ({
  toast: { custom: vi.fn(), dismiss: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('showToast', () => {
  it.each([
    { variant: 'success', duration: 4000 },
    { variant: 'error', duration: 6000 },
    { variant: 'info', duration: 4000 },
  ] as const)(
    'defaults the $variant toast to a $duration ms duration',
    ({ variant, duration }) => {
      showToast(variant, '已完成');

      expect(toast.custom).toHaveBeenCalledWith(expect.any(Function), {
        duration,
      });
    },
  );

  it('lets the caller override the default duration', () => {
    showToast('success', '已完成', { duration: 1000 });

    expect(toast.custom).toHaveBeenCalledWith(expect.any(Function), {
      duration: 1000,
    });
  });

  it.each([
    {
      variant: 'success',
      iconClassName: 'text-primary',
      accentClassName: 'border-l-primary',
    },
    {
      variant: 'error',
      iconClassName: 'text-destructive',
      accentClassName: 'border-l-destructive',
    },
    {
      variant: 'info',
      iconClassName: 'text-muted-foreground',
      accentClassName: 'border-l-muted-foreground',
    },
  ] as const)(
    'renders the $variant toast with its accent color, icon, and content',
    ({ variant, iconClassName, accentClassName }) => {
      showToast(variant, '已完成');

      const renderToast = vi.mocked(toast.custom).mock.calls[0][0];
      render(<>{renderToast('toast-1')}</>);

      expect(screen.getByText('已完成')).toBeInTheDocument();
      const card = screen.getByRole('status');
      expect(card).toHaveClass(accentClassName);
      // eslint-disable-next-line testing-library/no-node-access
      expect(card.querySelector('svg')).toHaveClass(iconClassName);
    },
  );

  it('dismisses the toast immediately when clicked', () => {
    showToast('success', '已完成');

    const renderToast = vi.mocked(toast.custom).mock.calls[0][0];
    render(<>{renderToast('toast-1')}</>);

    fireEvent.click(screen.getByRole('status'));

    expect(toast.dismiss).toHaveBeenCalledWith('toast-1');
  });
});
