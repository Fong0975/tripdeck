import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

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
 * and close button. Closes on overlay click and on Escape.
 */
export default function Modal({
  title,
  onClose,
  children,
  maxWidth = 'max-w-md',
  scrollable = false,
}: Props) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-black/50 backdrop-blur-xs'
        onClick={onClose}
      />

      <div
        className={`relative w-full animate-slide-up border-border bg-card ${maxWidth} rounded-2xl border p-6 shadow-2xl ${
          scrollable ? 'max-h-[90vh] overflow-y-auto' : ''
        }`}
      >
        <div className='mb-6 flex items-center justify-between'>
          <h2 className='text-xl font-bold text-foreground'>{title}</h2>
          <button
            onClick={onClose}
            className='rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            <X size={20} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
