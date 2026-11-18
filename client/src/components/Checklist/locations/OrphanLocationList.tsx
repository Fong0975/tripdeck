import type { OrphanLocation } from '@tripdeck/shared';

interface Props {
  orphans: readonly OrphanLocation[];
  /** Re-creates the label with the same name; resolves to whether it succeeded. */
  onRestore: (name: string) => Promise<boolean>;
}

/**
 * Lists the deleted labels that trips still use, so the user can decide to
 * add them back. Renders nothing when there are none.
 */
export default function OrphanLocationList({ orphans, onRestore }: Props) {
  if (orphans.length === 0) {
    return null;
  }

  return (
    <section className='space-y-2'>
      <h3 className='text-sm font-semibold text-foreground'>
        已刪除但旅程仍在使用
      </h3>
      <p className='text-xs text-muted-foreground'>
        這些存放位置已不在上方清單，但既有旅程仍沿用，勾選紀錄不受影響。加回後即可再次選用。
      </p>
      <ul className='space-y-2'>
        {orphans.map(orphan => (
          <li
            key={orphan.name}
            className='flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2'
          >
            <span className='min-w-0 flex-1 truncate text-foreground'>
              {orphan.name}
            </span>
            <span className='shrink-0 text-xs text-muted-foreground'>
              {orphan.trip_count} 個旅程使用
            </span>
            <button
              type='button'
              aria-label={`加回 ${orphan.name}`}
              onClick={() => void onRestore(orphan.name)}
              className='shrink-0 rounded-lg border border-border px-3 py-1 text-xs text-foreground transition-colors hover:bg-accent'
            >
              加回
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
