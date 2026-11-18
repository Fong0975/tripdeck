import { summarizeSpecLocations } from '@/components/Checklist/shared/checklistUtils';
import StorageBadges from '@/components/Checklist/shared/StorageBadges';
import type { ChecklistItem } from '@/types';

interface Props {
  item: ChecklistItem;
}

/**
 * Read-only card for one template item. The item name, quantity, notes and
 * storage badges sit on the card itself, while specs are nested in a tinted,
 * accent-ruled block so the item → spec hierarchy reads at a glance.
 */
export default function ItemCard({ item }: Props) {
  const specs = item.specs ?? [];
  const itemLocation =
    specs.length > 0 ? summarizeSpecLocations(specs) : item.storage_location;

  return (
    <li className='rounded-xl border border-border bg-background p-4'>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1.5'>
        <h4 className='text-base font-semibold text-foreground'>{item.name}</h4>
        <span className='rounded-md bg-muted px-2 py-0.5 text-sm text-muted-foreground'>
          {item.quantity ? `× ${item.quantity}` : '些許'}
        </span>
        {itemLocation && (
          <span className='flex items-center gap-1'>
            <StorageBadges value={itemLocation} />
          </span>
        )}
      </div>

      {item.notes && (
        <p className='mt-2 text-sm leading-relaxed text-muted-foreground'>
          {item.notes}
        </p>
      )}

      {specs.length > 0 && (
        <ol
          aria-label='規格'
          className='mt-3 space-y-2 rounded-lg border-l-4 border-primary/40 bg-muted/50 py-2.5 pr-3 pl-4'
        >
          {specs.map((spec, idx) => (
            <li
              key={spec.id}
              className='flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground'
            >
              <span className='text-muted-foreground tabular-nums'>
                {idx + 1}.
              </span>
              <span>{spec.name}</span>
              {spec.storage_location && (
                <span className='flex items-center gap-1'>
                  <StorageBadges value={spec.storage_location} compact />
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}
