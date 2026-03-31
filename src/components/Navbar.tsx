import { Moon, Sun } from 'lucide-react';
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

        <button
          onClick={toggle}
          aria-label='切換主題'
          className='rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
