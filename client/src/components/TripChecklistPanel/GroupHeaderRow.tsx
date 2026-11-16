interface Props {
  label: string;
  /** Number of rows listed under this header. */
  count: number;
  /** Number of columns the header spans. */
  colSpan: number;
}

/** A full-width section header row, used for categories and storage groups. */
export default function GroupHeaderRow({ label, count, colSpan }: Props) {
  return (
    <tr className='border-b border-border bg-primary/10'>
      <td
        colSpan={colSpan}
        className='sticky left-0 z-10 border-l-4 border-primary bg-primary/10 px-4 py-2.5'
      >
        <div className='flex items-baseline gap-2'>
          <span className='text-base font-semibold text-foreground'>
            {label}
          </span>
          <span className='text-sm text-muted-foreground'>{count} 項</span>
        </div>
      </td>
    </tr>
  );
}
