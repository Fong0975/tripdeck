import { Loader2, Plus, RefreshCw } from 'lucide-react';

interface Props {
  syncing: boolean;
  onSyncTemplate: () => void;
  onEdit: () => void;
}

/**
 * Shown when a trip checklist has no categories: offers copying the global
 * template or building the checklist by hand. The sync button disappears by
 * itself once the checklist has data, because this view is no longer rendered.
 */
export default function EmptyChecklistState({
  syncing,
  onSyncTemplate,
  onEdit,
}: Props) {
  return (
    <div className='flex flex-1 items-center justify-center py-24 text-center'>
      <div>
        <p className='mb-2 text-4xl'>🧳</p>
        <p className='mb-4 text-sm text-muted-foreground'>
          此行程尚無行李清單，可從範本同步，或自行建立。
        </p>
        <div className='flex items-center justify-center gap-2'>
          <button
            onClick={onSyncTemplate}
            disabled={syncing}
            className='inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60'
          >
            {syncing ? (
              <Loader2 size={12} className='animate-spin' />
            ) : (
              <RefreshCw size={12} />
            )}
            {syncing ? '同步中…' : '從範本同步'}
          </button>
          <button
            onClick={onEdit}
            disabled={syncing}
            className='inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60'
          >
            <Plus size={12} />
            編輯清單
          </button>
        </div>
      </div>
    </div>
  );
}
