import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

import { useEscapeToClose } from '@/hooks/useEscapeToClose';

interface Props {
  /** Element the popover opens next to; clicks on it do not dismiss the popover. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Accessible name of the popover. */
  label: string;
  onClose: () => void;
  children: ReactNode;
}

const GAP = 4;
const VIEWPORT_MARGIN = 8;

/**
 * Small floating panel placed next to an anchor element, rendered through a
 * portal so scrolling or clipping ancestors (e.g. a modal body) cannot cut it
 * off. It opens below the anchor, or above when there is no room below, and
 * closes on Escape (only while it is the top-most dialog), on a click outside
 * it, and when the page is scrolled or resized.
 */
export default function AnchoredPopover({
  anchorRef,
  label,
  onClose,
  children,
}: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  useEscapeToClose(onClose);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) {
      return;
    }
    const anchorBox = anchor.getBoundingClientRect();
    const { offsetHeight: height, offsetWidth: width } = popover;
    const below = anchorBox.bottom + GAP;
    const above = anchorBox.top - GAP - height;
    const fitsBelow = below + height <= window.innerHeight - VIEWPORT_MARGIN;
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(anchorBox.left, window.innerWidth - width - VIEWPORT_MARGIN),
    );

    setPosition({ top: fitsBelow || above < 0 ? below : above, left });
  }, [anchorRef]);

  useEffect(() => {
    const isInside = (target: EventTarget | null): boolean =>
      target instanceof Node &&
      (popoverRef.current?.contains(target) === true ||
        anchorRef.current?.contains(target) === true);
    const handlePointerDown = (e: MouseEvent) => {
      if (!isInside(e.target)) {
        onClose();
      }
    };
    const handleScroll = (e: Event) => {
      if (!popoverRef.current?.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [anchorRef, onClose]);

  return createPortal(
    <div
      ref={popoverRef}
      role='group'
      aria-label={label}
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? 'visible' : 'hidden',
      }}
      className='fixed z-60 min-w-40 rounded-xl border border-border bg-card p-2 shadow-xl'
    >
      {children}
    </div>,
    document.body,
  );
}
