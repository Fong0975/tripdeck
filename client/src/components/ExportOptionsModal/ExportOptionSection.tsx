import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
}

/** A titled group of related settings inside the export options dialog. */
export default function ExportOptionSection({
  title,
  description,
  children,
}: Props) {
  return (
    <section className='space-y-3'>
      <div>
        <h3 className='text-sm font-semibold text-foreground'>{title}</h3>
        {description && (
          <p className='mt-0.5 text-xs text-muted-foreground'>{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
