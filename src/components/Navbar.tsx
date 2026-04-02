import { Info, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useTheme } from '@/hooks/useTheme';

export default function Navbar() {
  const { theme, toggle } = useTheme();

  return (
    <header
      className='glass sticky top-0 z-50 border-b border-border'
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className='mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4'>
        <Link
          to='/'
          className='flex items-center gap-3 transition-opacity hover:opacity-80'
        >
          <img
            src='/logo.svg'
            alt='Tripdeck Logo'
            className='size-8 object-contain'
          />
          <span className='shimmer-text text-xl font-bold tracking-tight'>
            Tripdeck
          </span>
        </Link>

        <div className='flex items-center gap-1'>
          <button
            onClick={toggle}
            aria-label='切換主題'
            className='rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className='group relative'>
            <button
              aria-label='關於'
              className='rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
            >
              <Info size={20} />
            </button>
            <div className='pointer-events-none absolute right-0 top-full mt-1.5 w-max rounded-lg border border-border bg-card px-3 py-2 text-card-foreground opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100'>
              <p className='text-xs font-medium'>Tripdeck {__APP_VERSION__}</p>
              <p className='mt-0.5 text-xs text-muted-foreground'>
                Copyright © {new Date().getFullYear()} SWind All rights
                reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
