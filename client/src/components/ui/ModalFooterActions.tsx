interface Props {
  onCancel: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  disabled?: boolean;
  /** True while the form's submit action is in flight; disables the submit button and shows `submittingLabel`. */
  submitting?: boolean;
  submittingLabel?: string;
}

/** Shared cancel/submit button row for forms inside a {@link Modal}. */
export default function ModalFooterActions({
  onCancel,
  cancelLabel = '取消',
  submitLabel = '儲存',
  disabled = false,
  submitting = false,
  submittingLabel = '儲存中…',
}: Props) {
  return (
    <div className='flex gap-3 pt-2'>
      <button
        type='button'
        onClick={onCancel}
        className='flex-1 rounded-xl border border-border px-4 py-2 text-foreground transition-colors hover:bg-accent'
      >
        {cancelLabel}
      </button>
      <button
        type='submit'
        disabled={disabled || submitting}
        className='flex-1 rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50'
      >
        {submitting ? submittingLabel : submitLabel}
      </button>
    </div>
  );
}
