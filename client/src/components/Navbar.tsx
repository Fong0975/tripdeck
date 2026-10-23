import { Github, Info, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useTheme } from '@/hooks/useTheme';

const GITHUB_URL = 'https://github.com/Fong0975/tripdeck';

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const [apiVersion, setApiVersion] = useState<string | null>(null);

  useEffect(() => {
    const domain = import.meta.env.VITE_API_DOMAIN;
    const port =
      import.meta.env.VITE_API_PUBLIC_PORT || import.meta.env.VITE_API_PORT;
    /* v8 ignore next -- domain truthy branch depends on VITE_API_DOMAIN env var, not set in test env */
    const apiBase = domain ? `${domain}:${port}` : '';
    fetch(`${apiBase}/api/info`)
      .then(res => res.json())
      .then((data: { version: string }) => setApiVersion(data.version))
      .catch(() => {});
  }, []);

  return (
    <header
      className='sticky top-0 z-50 border-b border-border glass'
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-4'>
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
            className='group rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            {theme === 'dark' ? (
              <Sun
                size={20}
                className='transition-transform duration-300 ease-out group-hover:rotate-45'
              />
            ) : (
              <Moon
                size={20}
                className='transition-transform duration-300 ease-out group-hover:-rotate-12'
              />
            )}
          </button>

          <div className='group relative'>
            <button
              aria-label='關於'
              aria-haspopup='true'
              className='rounded-lg p-2 text-muted-foreground transition-colors group-focus-within:bg-accent group-focus-within:text-foreground hover:bg-accent hover:text-foreground focus:outline-hidden'
            >
              <Info
                size={20}
                className='transition-transform duration-300 ease-out group-focus-within:-translate-y-0.5 group-focus-within:scale-110 group-hover:-translate-y-0.5 group-hover:scale-110'
              />
            </button>
            <div className='absolute top-full right-0 z-10 hidden w-max pt-1.5 group-focus-within:block group-hover:block'>
              <div className='rounded-lg border border-border bg-card px-3 py-2 text-card-foreground shadow-md'>
                <p className='text-xs font-medium'>
                  Tripdeck {__APP_VERSION__}
                  {apiVersion && (
                    <span className='ml-1 font-normal text-muted-foreground'>
                      (API v{apiVersion})
                    </span>
                  )}
                </p>
                <p className='mt-0.5 text-xs whitespace-nowrap text-muted-foreground'>
                  Copyright © {new Date().getFullYear()} SWind All rights
                  reserved.
                </p>
                <a
                  href={GITHUB_URL}
                  target='_blank'
                  rel='noopener noreferrer'
                  role='menuitem'
                  className='mt-2 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground'
                >
                  <Github size={14} />
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
