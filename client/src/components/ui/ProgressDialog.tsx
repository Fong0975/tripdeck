import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  /** Whether the work being waited for is in progress. */
  open: boolean;
  /** Short text explaining what is being processed. */
  message: string;
  /** Wait before showing, so fast operations never flash a dialog. */
  delayMs?: number;
}

/**
 * Blocking "in progress" dialog with a circular spinner. It appears only once
 * `open` has stayed true for `delayMs`, covers the whole screen (including any
 * modal underneath) and cannot be dismissed; it closes when `open` turns false.
 */
export default function ProgressDialog({
  open,
  message,
  delayMs = 400,
}: Props) {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = setTimeout(() => setElapsed(true), delayMs);
    return () => {
      clearTimeout(timer);
      setElapsed(false);
    };
  }, [open, delayMs]);

  if (!open || !elapsed) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4'>
      <div
        role='status'
        className='flex flex-col items-center gap-3 rounded-xl bg-card px-8 py-6 text-card-foreground shadow-lg'
      >
        <Loader2 size={36} className='animate-spin text-primary' />
        <p className='text-sm'>{message}</p>
      </div>
    </div>
  );
}
