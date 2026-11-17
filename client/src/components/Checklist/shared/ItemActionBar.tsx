import { ArrowRightLeft, Trash2 } from 'lucide-react';

interface Props {
  onMove?: () => void;
  /** Disables the move button, e.g. for unsaved items or a single category. */
  moveDisabled?: boolean;
  onDelete: () => void;
}

/** Bottom-right action row of an editable checklist item. */
export default function ItemActionBar({
  onMove,
  moveDisabled = false,
  onDelete,
}: Props) {
  return (
    <div className='mt-3 flex items-center justify-end gap-1 border-t border-border pt-2'>
      {onMove && (
        <button
          type='button'
          onClick={onMove}
          disabled={moveDisabled}
          className='rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground'
          aria-label='移動項目到其他分類'
          title='移動到其他分類'
        >
          <ArrowRightLeft size={16} />
        </button>
      )}
      <button
        type='button'
        onClick={onDelete}
        className='rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive'
        aria-label='刪除項目'
        title='刪除項目'
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
