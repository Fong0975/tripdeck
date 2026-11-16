import { FolderInput, Settings } from 'lucide-react';

interface Props {
  onImportExport: () => void;
}

/**
 * Navbar settings button whose dropdown of app-level actions shows on hover
 * or while the button has focus (keyboard and touch).
 */
export default function SettingsMenu({ onImportExport }: Props) {
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
        aria-label='設定'
        aria-haspopup='menu'
        className='rounded-lg p-2 text-muted-foreground transition-colors group-focus-within:bg-accent group-focus-within:text-foreground hover:bg-accent hover:text-foreground focus:outline-hidden'
      >
        <Settings
          size={20}
          className='transition-transform duration-300 ease-out group-focus-within:rotate-45 group-hover:rotate-45'
        />
      </button>

      <div className='absolute top-full right-0 z-10 hidden w-max min-w-36 pt-1.5 group-focus-within:block group-hover:block'>
        <div
          role='menu'
          className='rounded-lg border border-border bg-card p-1 text-card-foreground shadow-md'
        >
          <button
            role='menuitem'
            onClick={() => handleSelect(onImportExport)}
            className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent'
          >
            <FolderInput size={16} />
            匯入 / 匯出
          </button>
        </div>
      </div>
    </div>
  );
}
