import StorageBadges from '@/components/checklist/shared/StorageBadges';
import type { ChecklistItem, ChecklistOccasion } from '@/types';

interface Props {
  item: ChecklistItem;
  index: number;
  occasions: ChecklistOccasion[];
  getCheck: (occId: number, itemId: number) => boolean;
  onToggleCheck: (occId: number, itemId: number) => void;
}

export default function ChecklistItemRow({
  item,
  index,
  occasions,
  getCheck,
  onToggleCheck,
}: Props) {
  return (
    <tr
      className={`border-border hover:bg-accent/40 border-b transition-colors ${
        index % 2 === 0 ? '' : 'bg-muted/10'
      }`}
    >
      <td className='bg-background group-hover:bg-accent/40 sticky left-0 z-10 px-4 py-3'>
        <div className='flex flex-col gap-0.5'>
          <div className='flex items-baseline gap-2'>
            <span className='text-foreground text-sm font-medium'>
              {item.name}
            </span>
            <span className='text-muted-foreground text-xs'>
              {item.quantity ? `× ${item.quantity}` : '些許'}
            </span>
          </div>
          {item.notes && (
            <p className='text-muted-foreground text-xs'>{item.notes}</p>
          )}
          {item.storage_location && (
            <div className='flex items-center gap-1.5'>
              <StorageBadges value={item.storage_location} />
            </div>
          )}
          {(item.specs ?? []).length > 0 && (
            <div className='border-border mt-0.5 space-y-0.5 border-l-2 pl-3'>
              {(item.specs ?? []).map((spec, specIdx) => (
                <div
                  key={spec.id}
                  className='flex flex-wrap items-center gap-x-1.5 gap-y-0.5'
                >
                  <span className='text-muted-foreground text-xs'>
                    {specIdx + 1}.
                  </span>
                  <span className='text-foreground/80 text-xs'>
                    {spec.name}
                  </span>
                  <StorageBadges value={spec.storage_location} compact />
                </div>
              ))}
            </div>
          )}
        </div>
      </td>

      {occasions.map(occ => (
        <td
          key={occ.id}
          className='cursor-pointer px-4 py-2.5 text-center'
          onClick={() => onToggleCheck(occ.id, item.id)}
        >
          <label className='flex cursor-pointer items-center justify-center'>
            <input
              type='checkbox'
              checked={getCheck(occ.id, item.id)}
              onChange={() => onToggleCheck(occ.id, item.id)}
              onClick={e => e.stopPropagation()}
              className='border-border accent-primary size-4 cursor-pointer rounded'
            />
          </label>
        </td>
      ))}

      <td />
    </tr>
  );
}
