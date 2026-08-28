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
            className='text-muted-foreground hover:bg-accent hover:text-foreground group rounded-lg p-2 transition-colors'
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
              className='text-muted-foreground hover:bg-accent hover:text-foreground group-focus-within:bg-accent group-focus-within:text-foreground rounded-lg p-2 transition-colors focus:outline-none'
            >
              <Info
                size={20}
                className='transition-transform duration-300 ease-out group-focus-within:-translate-y-0.5 group-focus-within:scale-110 group-hover:-translate-y-0.5 group-hover:scale-110'
              />
            </button>
            <div className='absolute right-0 top-full z-10 hidden w-max pt-1.5 group-focus-within:block group-hover:block'>
              <div className='border-border bg-card text-card-foreground rounded-lg border px-3 py-2 shadow-md'>
                <p className='text-xs font-medium'>
                  Tripdeck {__APP_VERSION__}
                  {apiVersion && (
                    <span className='text-muted-foreground ml-1 font-normal'>
                      (API v{apiVersion})
                    </span>
                  )}
                </p>
                <p className='text-muted-foreground mt-0.5 whitespace-nowrap text-xs'>
                  Copyright © {new Date().getFullYear()} SWind All rights
                  reserved.
                </p>
                <a
                  href={GITHUB_URL}
                  target='_blank'
                  rel='noopener noreferrer'
                  role='menuitem'
                  className='text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1.5 text-xs transition-colors'
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
