import { X } from 'lucide-react';
import { type ReactNode, useId } from 'react';

import ModalOverlay from './ModalOverlay';

interface Props {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind max-width class for the modal panel. Defaults to 'max-w-md'. */
  maxWidth?: string;
  /** Caps panel height at 90vh and enables vertical scrolling for long forms. */
  scrollable?: boolean;
}

/**
 * Shared modal shell: full-screen overlay + centered panel with a title bar
 * and close button. Closes on overlay click and on Escape (only while it is
 * the top-most open dialog). The panel is exposed to assistive technology as a
 * modal dialog labelled by its title.
 */
export default function Modal({
  title,
  onClose,
  children,
  maxWidth = 'max-w-md',
  scrollable = false,
}: Props) {
  const titleId = useId();

  return (
    <ModalOverlay onClose={onClose} backdropClassName='backdrop-blur-xs'>
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        className={`relative w-full animate-slide-up border-border bg-card ${maxWidth} rounded-2xl border p-6 shadow-2xl ${
          scrollable ? 'max-h-[90vh] overflow-y-auto' : ''
        }`}
      >
        <div className='mb-6 flex items-center justify-between'>
          <h2 id={titleId} className='text-xl font-bold text-foreground'>
            {title}
          </h2>
          <button
            type='button'
            aria-label='關閉'
            onClick={onClose}
            className='rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </ModalOverlay>
  );
}
