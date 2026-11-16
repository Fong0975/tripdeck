import type { ReactNode } from 'react';

/** One selectable entry of a {@link HoverMenu}. */
export interface HoverMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  title?: string;
}

interface Props {
  /** Accessible name of the trigger button. */
  ariaLabel: string;
  /** Content of the trigger button (icon and/or text). */
  trigger: ReactNode;
  /** Sizing and shape classes for the trigger button. */
  triggerClassName?: string;
  items: HoverMenuItem[];
  /** Which edge of the trigger the dropdown aligns to. */
  align?: 'left' | 'right';
}

/**
 * Button whose dropdown menu shows on hover or while the button has focus
 * (keyboard and touch). Visibility is pure CSS (`group-hover` /
 * `group-focus-within`), so the trigger content can react to it through the
 * `group` classes.
 */
export default function HoverMenu({
  ariaLabel,
  trigger,
  triggerClassName = 'rounded-lg p-2',
  items,
  align = 'right',
}: Props) {
  const handleSelect = (action: () => void) => {
    // Releases focus so the focus-within dropdown closes after a choice.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    action();
  };

  return (
    <div className='group relative'>
      <button
        type='button'
        aria-label={ariaLabel}
        aria-haspopup='menu'
        className={`text-muted-foreground transition-colors group-focus-within:bg-accent group-focus-within:text-foreground hover:bg-accent hover:text-foreground focus:outline-hidden ${triggerClassName}`}
      >
        {trigger}
      </button>

      <div
        data-testid='hover-menu-dropdown'
        className={`absolute top-full z-20 hidden w-max min-w-36 pt-1.5 group-focus-within:block group-hover:block ${
          align === 'right' ? 'right-0' : 'left-0'
        }`}
      >
        <div
          role='menu'
          className='rounded-lg border border-border bg-card p-1 text-card-foreground shadow-md'
        >
          {items.map(item => (
            <button
              key={item.label}
              type='button'
              role='menuitem'
              title={item.title}
              disabled={item.disabled}
              onClick={() => handleSelect(item.onSelect)}
              className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors enabled:hover:bg-accent disabled:opacity-50'
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
