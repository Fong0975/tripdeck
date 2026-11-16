interface Props {
  label: string;
  /** Number of columns the subheader spans. */
  colSpan: number;
}

/** A subheader row naming the category of the rows beneath it. */
export default function CategorySubheaderRow({ label, colSpan }: Props) {
  return (
    <tr className='border-b border-border bg-muted/40'>
      <td
        colSpan={colSpan}
        className='sticky left-0 z-10 bg-muted/40 py-1.5 pr-4 pl-8 text-sm font-medium text-muted-foreground'
      >
        {label}
      </td>
    </tr>
  );
}
