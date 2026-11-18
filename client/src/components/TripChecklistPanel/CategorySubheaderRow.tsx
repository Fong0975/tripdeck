interface Props {
  label: string;
  /** Number of columns the subheader spans. */
  colSpan: number;
}

/**
 * A subheader row naming the category of the rows beneath it. It sticks
 * right below the group header row, overlapping it by 2px so subpixel
 * rounding and row borders never leave a gap that rows scroll through.
 */
export default function CategorySubheaderRow({ label, colSpan }: Props) {
  return (
    <tr className='border-b border-border bg-muted/40'>
      <td
        colSpan={colSpan}
        className='sticky top-[calc(var(--checklist-head-h,0px)+2.75rem-2px)] left-0 z-20 bg-background p-0'
      >
        <div className='bg-muted/40 py-1.5 pr-4 pl-8 text-sm font-medium text-muted-foreground'>
          {label}
        </div>
      </td>
    </tr>
  );
}
