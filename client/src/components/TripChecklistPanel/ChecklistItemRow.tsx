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
      className={`border-b border-border transition-colors hover:bg-accent/40 ${
        index % 2 === 0 ? '' : 'bg-muted/10'
      }`}
    >
      <td className='sticky left-0 z-10 bg-background px-4 py-3 group-hover:bg-accent/40'>
        <div className='flex flex-col gap-0.5'>
          <div className='flex items-baseline gap-2'>
            <span className='text-sm font-medium text-foreground'>
              {item.name}
            </span>
            <span className='text-xs text-muted-foreground'>
              {item.quantity ? `× ${item.quantity}` : '些許'}
            </span>
          </div>
          {item.notes && (
            <p className='text-xs text-muted-foreground'>{item.notes}</p>
          )}
          {item.storage_location && (
            <div className='flex items-center gap-1.5'>
              <StorageBadges value={item.storage_location} />
            </div>
          )}
          {(item.specs ?? []).length > 0 && (
            <div className='mt-0.5 space-y-0.5 border-l-2 border-border pl-3'>
              {(item.specs ?? []).map((spec, specIdx) => (
                <div
                  key={spec.id}
                  className='flex flex-wrap items-center gap-x-1.5 gap-y-0.5'
                >
                  <span className='text-xs text-muted-foreground'>
                    {specIdx + 1}.
                  </span>
                  <span className='text-xs text-foreground/80'>
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
              className='size-4 cursor-pointer rounded-sm border-border accent-primary'
            />
          </label>
        </td>
      ))}

      <td />
    </tr>
  );
}
