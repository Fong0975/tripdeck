import { useId } from 'react';
import { createPortal } from 'react-dom';

import { useEscapeToClose } from '@/hooks/useEscapeToClose';

export interface MoveTargetCategory {
  id: number;
  name: string;
}

interface Props {
  itemName: string;
  /** Categories the item can move to, excluding the one it is in. */
  categories: MoveTargetCategory[];
  onSelect: (categoryId: number) => void;
  onCancel: () => void;
}

/**
 * Sub-dialog for choosing the category an item is moved to. Rendered through
 * a portal so it covers the whole viewport above the editor modal, and
 * Escape closes only this dialog.
 */
export default function MoveItemDialog({
  itemName,
  categories,
  onSelect,
  onCancel,
}: Props) {
  useEscapeToClose(onCancel);
  const titleId = useId();

  return createPortal(
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div className='absolute inset-0 bg-black/50' onClick={onCancel} />
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        className='relative flex max-h-[70vh] w-full max-w-sm flex-col rounded-2xl border border-border bg-card p-6 shadow-xl'
      >
        <p id={titleId} className='font-semibold text-foreground'>
          移動到其他分類
        </p>
        <p className='mt-1 truncate text-sm text-muted-foreground'>
          選擇「{itemName || '未命名項目'}」要移動到的分類，將放在該分類的最後。
        </p>
        <ul className='mt-4 min-h-0 flex-1 space-y-1.5 overflow-y-auto'>
          {categories.map(cat => (
            <li key={cat.id}>
              <button
                type='button'
                onClick={() => onSelect(cat.id)}
                className='w-full truncate rounded-lg border border-border px-3.5 py-2.5 text-left text-sm text-foreground transition-colors hover:border-primary hover:bg-accent'
              >
                {cat.name || '未命名分類'}
              </button>
            </li>
          ))}
        </ul>
        <div className='mt-5 flex justify-end'>
          <button
            type='button'
            onClick={onCancel}
            className='px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground'
          >
            取消
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
