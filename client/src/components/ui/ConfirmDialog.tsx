interface Props {
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Generic destructive-action confirmation dialog. */
export default function ConfirmDialog({
  title,
  message,
  cancelLabel = '取消',
  confirmLabel = '確定',
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div className='absolute inset-0 bg-black/50' />
      <div className='bg-card border-border relative w-full max-w-sm rounded-2xl border p-6 shadow-xl'>
        <p className='text-foreground font-semibold'>{title}</p>
        <p className='text-muted-foreground mt-1 text-sm'>{message}</p>
        <div className='mt-5 flex items-center justify-end gap-3'>
          <button
            onClick={onCancel}
            className='text-muted-foreground hover:text-foreground px-4 py-2 text-sm transition-colors'
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors'
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
