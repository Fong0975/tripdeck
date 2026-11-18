import { getEffectiveLocations, NO_LOCATION } from '@tripdeck/shared';
import { Package } from 'lucide-react';

interface Props {
  value: string | null | undefined;
  /** Smaller icon/badge sizing for use inside a spec row. */
  compact?: boolean;
}

/** Renders one badge per storage location of a checklist item or spec. */
export default function StorageBadges({ value, compact = false }: Props) {
  const names = getEffectiveLocations(value).filter(
    name => name !== NO_LOCATION,
  );
  if (names.length === 0) {
    return null;
  }
  return (
    <>
      <Package size={compact ? 11 : 13} className='text-muted-foreground' />
      {names.map(name => (
        <span
          key={name}
          className={`rounded-sm bg-primary/10 py-0.5 text-primary ${compact ? 'px-1 text-xs' : 'px-1.5 text-sm'}`}
        >
          {name}
        </span>
      ))}
    </>
  );
}
