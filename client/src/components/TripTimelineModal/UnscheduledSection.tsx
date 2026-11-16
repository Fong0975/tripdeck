import type { Attraction } from '@/types';

interface Props {
  attractions: Attraction[];
}

/** Compact list of a day's attractions that have no usable time. */
export default function UnscheduledSection({ attractions }: Props) {
  return (
    <ul className='flex flex-col gap-1 p-2'>
      {attractions.map(attraction => (
        <li
          key={attraction.id}
          title={attraction.name}
          className='truncate rounded-md border border-dashed border-border bg-muted/40 px-2 py-1 text-sm text-foreground'
        >
          {attraction.name}
        </li>
      ))}
    </ul>
  );
}
