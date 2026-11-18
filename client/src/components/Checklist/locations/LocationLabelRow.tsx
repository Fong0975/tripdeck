import type { LocationLabel } from '@tripdeck/shared';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';

interface Props {
  label: LocationLabel;
  isFirst: boolean;
  isLast: boolean;
  onToggleGroup: (showAsGroup: boolean) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}

const ICON_BUTTON_CLS =
  'rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent';

/** One location label with its group toggle, order buttons and delete button. */
export default function LocationLabelRow({
  label,
  isFirst,
  isLast,
  onToggleGroup,
  onMove,
  onDelete,
}: Props) {
  return (
    <li className='flex items-center gap-2 rounded-xl border border-border px-3 py-2'>
      <span className='min-w-0 flex-1 truncate font-medium text-foreground'>
        {label.name}
      </span>
      <label className='flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground'>
        <input
          type='checkbox'
          aria-label={`${label.name} 獨立分組`}
          checked={label.show_as_group}
          onChange={e => onToggleGroup(e.target.checked)}
        />
        獨立分組
      </label>
      <button
        type='button'
        aria-label={`上移 ${label.name}`}
        disabled={isFirst}
        onClick={() => onMove(-1)}
        className={ICON_BUTTON_CLS}
      >
        <ArrowUp size={14} />
      </button>
      <button
        type='button'
        aria-label={`下移 ${label.name}`}
        disabled={isLast}
        onClick={() => onMove(1)}
        className={ICON_BUTTON_CLS}
      >
        <ArrowDown size={14} />
      </button>
      <button
        type='button'
        aria-label={`刪除 ${label.name}`}
        onClick={onDelete}
        className={`${ICON_BUTTON_CLS} hover:text-destructive`}
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}
