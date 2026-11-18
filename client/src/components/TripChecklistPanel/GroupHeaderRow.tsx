/**
 * Fixed height of the header row. The category subheader sticks right below
 * it, so its `top` offset (2.75rem, minus a 2px overlap) must match this.
 */
const GROUP_HEADER_HEIGHT_CLASS = 'h-11';

interface Props {
  label: string;
  /** Number of rows listed under this header. */
  count: number;
  /** Number of columns the header spans. */
  colSpan: number;
}

/**
 * A full-width section header row, used for categories and storage groups.
 * It sticks below the table header while its section scrolls.
 */
export default function GroupHeaderRow({ label, count, colSpan }: Props) {
  return (
    <tr className='border-b border-border bg-primary/10'>
      <td
        colSpan={colSpan}
        className='sticky top-[calc(var(--checklist-head-h,0px)-1px)] left-0 z-20 bg-background p-0'
      >
        <div
          className={`flex items-baseline gap-2 border-l-4 border-primary bg-primary/10 px-4 py-2.5 ${GROUP_HEADER_HEIGHT_CLASS}`}
        >
          <span className='text-base font-semibold text-foreground'>
            {label}
          </span>
          <span className='text-sm text-muted-foreground'>{count} 項</span>
        </div>
      </td>
    </tr>
  );
}
