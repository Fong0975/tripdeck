import ConfirmDialog from './ConfirmDialog';

interface Props {
  /** Keeps the dialog being edited open. */
  onCancel: () => void;
  /** Discards the unsaved edits and closes. */
  onConfirm: () => void;
}

/**
 * Confirmation shown when closing an editor that still has unsaved changes.
 */
export default function DiscardChangesDialog({ onCancel, onConfirm }: Props) {
  return (
    <ConfirmDialog
      title='確定要關閉嗎？'
      message='尚未儲存的變更將會遺失。'
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
