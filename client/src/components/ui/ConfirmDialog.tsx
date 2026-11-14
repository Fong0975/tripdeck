import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useEscapeToClose } from '@/hooks/useEscapeToClose';

interface Props {
  title: string;
  message: ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Generic destructive-action confirmation dialog.
 *
 * Rendered via a portal into `document.body` so its `fixed` overlay always
 * covers the full viewport, regardless of any ancestor with a `transform`
 * (e.g. a hover-animated card), which would otherwise clip/reposition it by
 * becoming its containing block. Click events still bubble through the React
 * tree as usual, so callers nesting this inside a clickable ancestor should
 * still stop propagation on it.
 *
 * Pressing Escape cancels the dialog. It joins the shared dialog stack, so
 * Escape only reaches this dialog and not a modal open underneath it.
 */
export default function ConfirmDialog({
  title,
  message,
  cancelLabel = '取消',
  confirmLabel = '確定',
  onCancel,
  onConfirm,
}: Props) {
  useEscapeToClose(onCancel);
  const titleId = useId();

  return createPortal(
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div className='absolute inset-0 bg-black/50' />
      <div
        role='alertdialog'
        aria-modal='true'
        aria-labelledby={titleId}
        className='relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl'
      >
        <p id={titleId} className='font-semibold text-foreground'>
          {title}
        </p>
        <p className='mt-1 text-sm text-muted-foreground'>{message}</p>
        <div className='mt-5 flex items-center justify-end gap-3'>
          <button
            onClick={onCancel}
            className='px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground'
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className='rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90'
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
