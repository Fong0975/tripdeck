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
      <Package size={compact ? 9 : 11} className='text-muted-foreground' />
      {matches.map(opt => (
        <span
          key={opt}
          className={`bg-primary/10 text-primary rounded py-0.5 text-xs ${compact ? 'px-1' : 'px-1.5'}`}
        >
          {opt}
        </span>
      ))}
    </>
  );
}
