import { Package } from 'lucide-react';

import { STORAGE_OPTIONS, hasStorageOption } from './checklistUtils';

interface Props {
  value: string | null | undefined;
  /** Smaller icon/badge sizing for use inside a spec row. */
  compact?: boolean;
}

/** Renders the storage-location badges (託運/隨身) for a checklist item or spec. */
export default function StorageBadges({ value, compact = false }: Props) {
  if (!value) {
    return null;
  }
  const matches = STORAGE_OPTIONS.filter(opt => hasStorageOption(value, opt));
  if (matches.length === 0) {
    return null;
  }
  return (
    <>
      <Package size={compact ? 11 : 13} className='text-muted-foreground' />
      {matches.map(opt => (
        <span
          key={opt}
          className={`rounded-sm bg-primary/10 py-0.5 text-primary ${compact ? 'px-1 text-xs' : 'px-1.5 text-sm'}`}
        >
          {opt}
        </span>
      ))}
    </>
  );
}
