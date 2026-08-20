interface Props {
  onCancel: () => void;
  cancelLabel?: string;
  submitLabel?: string;
}

/** Shared cancel/submit button row for forms inside a {@link Modal}. */
export default function ModalFooterActions({
  onCancel,
  cancelLabel = '取消',
  submitLabel = '儲存',
}: Props) {
  return (
    <div className='flex gap-3 pt-2'>
      <button
        type='button'
        onClick={onCancel}
        className='border-border text-foreground hover:bg-accent flex-1 rounded-xl border px-4 py-2 transition-colors'
      >
        {cancelLabel}
      </button>
      <button
        type='submit'
        className='bg-primary text-primary-foreground flex-1 rounded-xl px-4 py-2 font-medium transition-all hover:opacity-90 active:scale-95'
      >
        {submitLabel}
      </button>
    </div>
  );
}
