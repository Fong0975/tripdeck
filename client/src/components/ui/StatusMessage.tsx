import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';

const VARIANTS = {
  success: { Icon: CheckCircle2, className: 'bg-primary/10 text-primary' },
  error: { Icon: AlertCircle, className: 'bg-destructive/10 text-destructive' },
  info: { Icon: Info, className: 'bg-muted text-muted-foreground' },
} as const;

interface Props {
  variant: keyof typeof VARIANTS;
  children: ReactNode;
}

/**
 * Inline status/feedback text (a success confirmation, an error, or a
 * neutral info notice) shown as a tinted callout with a leading icon, so
 * it's visually distinct from plain descriptive text at a glance — a
 * color-only difference (or italics, which most CJK fonts don't render) is
 * too subtle to notice.
 */
export default function StatusMessage({ variant, children }: Props) {
  const { Icon, className } = VARIANTS[variant];
  return (
    <p
      className={`flex items-start gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${className}`}
    >
      <Icon size={16} className='mt-0.5 shrink-0' />
      <span>{children}</span>
    </p>
  );
}
