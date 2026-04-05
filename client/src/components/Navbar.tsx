import { Info, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useTheme } from '@/hooks/useTheme';

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const [apiVersion, setApiVersion] = useState<string | null>(null);

  useEffect(() => {
    const domain = import.meta.env.VITE_API_DOMAIN;
    const apiBase = domain ? `${domain}:${import.meta.env.VITE_API_PORT}` : '';
    fetch(`${apiBase}/api/info`)
      .then(res => res.json())
      .then((data: { version: string }) => setApiVersion(data.version))
      .catch(() => {});
  }, []);

  return (
    <header
      className='glass border-border sticky top-0 z-50 border-b'
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
            className='text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2 transition-colors'
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className='group relative'>
            <button
              aria-label='關於'
              className='text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2 transition-colors'
            >
              <Info size={20} />
            </button>
            <div className='border-border bg-card text-card-foreground pointer-events-none absolute right-0 top-full mt-1.5 w-max rounded-lg border px-3 py-2 opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100'>
              <p className='text-xs font-medium'>
                Tripdeck {__APP_VERSION__}
                {apiVersion && (
                  <span className='text-muted-foreground ml-1 font-normal'>
                    (API v{apiVersion})
                  </span>
                )}
              </p>
              <p className='text-muted-foreground mt-0.5 text-xs'>
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
