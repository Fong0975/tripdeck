import type { ReactNode } from 'react';

import { useEscapeToClose } from '@/hooks/useEscapeToClose';

interface Props {
  /** Called on backdrop click and on Escape (when this is the top-most dialog). */
  onClose: () => void;
  /** The dialog panel, rendered centered above the backdrop. */
  children: ReactNode;
  /** Extra classes for the backdrop (e.g. a blur). */
  backdropClassName?: string;
  /** Stops wheel events from reaching scroll handlers behind the dialog. */
  isolateWheel?: boolean;
}

/**
 * Full-screen dialog overlay: a dimmed backdrop that closes on click plus
 * Escape handling through the shared dialog stack. Callers supply their own
 * panel so dialogs with different layouts share one close behaviour.
 */
export default function ModalOverlay({
  onClose,
  children,
  backdropClassName = '',
  isolateWheel = false,
}: Props) {
  useEscapeToClose(onClose);

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4'
      onWheel={isolateWheel ? e => e.stopPropagation() : undefined}
    >
      <div
        className={`absolute inset-0 bg-black/50 ${backdropClassName}`}
        onClick={onClose}
      />
      {children}
    </div>
  );
}
