import type { ReactNode } from 'react';
import { toast } from 'sonner';

import { ToastCard } from './ToastCard';

export type ToastVariant = 'success' | 'error' | 'info';

interface ShowToastOptions {
  duration?: number;
}

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  error: 6000,
};

/**
 * Shows a global toast notification, rendered bottom-right of the viewport
 * (mounted once via `<Toaster />` in App.tsx) so it appears above any modal.
 * Themed for light/dark mode via the app's existing HSL design tokens.
 * Auto-dismisses after `options.duration` (a variant-specific default when
 * omitted), or immediately when clicked anywhere on the toast.
 */
export function showToast(
  variant: ToastVariant,
  content: ReactNode,
  options?: ShowToastOptions,
): void {
  toast.custom(
    id => (
      <ToastCard variant={variant} id={id}>
        {content}
      </ToastCard>
    ),
    { duration: options?.duration ?? DEFAULT_DURATIONS[variant] },
  );
}
