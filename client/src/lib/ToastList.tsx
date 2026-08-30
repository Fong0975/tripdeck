import type { ReactNode } from 'react';

/**
 * Shared bullet-list style for multi-line toast bodies (e.g. a list of
 * imported/failed trip titles), so callers don't each hand-roll list
 * styling.
 */
export function ToastList({ children }: { children: ReactNode }) {
  return (
    <ul className='list-disc space-y-0.5 pl-4 text-xs opacity-90'>
      {children}
    </ul>
  );
}
