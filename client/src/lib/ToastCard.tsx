import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

import type { ToastVariant } from './toast';

const VARIANTS = {
  success: { Icon: CheckCircle2, className: 'text-primary border-l-primary' },
  error: {
    Icon: AlertCircle,
    className: 'text-destructive border-l-destructive',
  },
  info: {
    Icon: Info,
    className: 'text-muted-foreground border-l-muted-foreground',
  },
} as const;

interface ToastCardProps {
  variant: ToastVariant;
  id: string | number;
  children: ReactNode;
}

/** Themed toast card rendered by `showToast` via sonner's `toast.custom`. */
export function ToastCard({ variant, id, children }: ToastCardProps) {
  const { Icon, className } = VARIANTS[variant];
  const [iconClassName, accentClassName] = className.split(' ');

  return (
    <div
      role='status'
      aria-live='polite'
      onClick={() => toast.dismiss(id)}
      className={`bg-card border-border flex w-[356px] max-w-[calc(100vw-2rem)] cursor-pointer items-start gap-2.5 rounded-lg border border-l-4 p-4 shadow-2xl ${accentClassName}`}
    >
      <Icon size={16} className={`mt-0.5 shrink-0 ${iconClassName}`} />
      <div className='text-foreground min-w-0 flex-1 text-sm'>{children}</div>
    </div>
  );
}
