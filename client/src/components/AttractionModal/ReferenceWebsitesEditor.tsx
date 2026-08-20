import { Plus, Trash2, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { INPUT_CLS } from '@/components/formStyles';
import type { ReferenceWebsite } from '@/types';

interface Props {
  websites: ReferenceWebsite[];
  onChange: (websites: ReferenceWebsite[]) => void;
}

const decodeHtmlEntities = (str: string): string => {
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value.replace(/\s+/g, ' ').trim();
};

/**
 * List editor for an attraction's reference websites, including a debounced
 * fetch of the page title to suggest as the link's display name.
 */
export default function ReferenceWebsitesEditor({ websites, onChange }: Props) {
  const [newWebsite, setNewWebsite] = useState<ReferenceWebsite>({
    url: '',
    title: '',
  });
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [titleFetchStatus, setTitleFetchStatus] = useState<
    'idle' | 'loading' | 'found' | 'not-found'
  >('idle');

  useEffect(() => {
    const url = newWebsite.url.trim();
    if (!url) {
      setSuggestedTitle('');
      setTitleFetchStatus('idle');
      return;
    }
    setSuggestedTitle('');
    setTitleFetchStatus('loading');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/fetch-title?url=${encodeURIComponent(url)}`,
          { signal: AbortSignal.timeout(10000) },
        );
        const data = (await res.json()) as { title: string | null };
        if (data.title) {
          setSuggestedTitle(decodeHtmlEntities(data.title));
          setTitleFetchStatus('found');
        } else {
          setTitleFetchStatus('not-found');
        }
      } catch {
        setTitleFetchStatus('not-found');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [newWebsite.url]);

  const addWebsite = () => {
    const url = newWebsite.url.trim();
    const title = newWebsite.title.trim();
    if (!url || !title) {
      return;
    }
    onChange([...websites, { url, title }]);
    setNewWebsite({ url: '', title: '' });
    setSuggestedTitle('');
    setTitleFetchStatus('idle');
  };

  const removeWebsite = (idx: number) =>
    onChange(websites.filter((_, i) => i !== idx));

  return (
    <div>
      <label className='text-foreground mb-1.5 block text-sm font-medium'>
        參考網站
      </label>
      <div className='space-y-2'>
        {websites.map((site, idx) => (
          <div key={idx} className='flex items-center gap-2'>
            <a
              href={site.url}
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary flex-1 truncate text-sm hover:underline'
            >
              {site.title || site.url}
            </a>
            <button
              type='button'
              tabIndex={-1}
              onClick={() => removeWebsite(idx)}
              className='text-muted-foreground hover:text-destructive p-1 transition-colors'
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <div className='space-y-1.5'>
          <input
            value={newWebsite.url}
            onChange={e =>
              setNewWebsite(prev => ({ ...prev, url: e.target.value }))
            }
            placeholder='https://...'
            className={`${INPUT_CLS} text-sm`}
          />
          <div className='flex gap-2'>
            <input
              value={newWebsite.title}
              onChange={e =>
                setNewWebsite(prev => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addWebsite();
                }
              }}
              placeholder='標題 *'
              className={`${INPUT_CLS} flex-1 text-sm`}
            />
            {titleFetchStatus !== 'idle' && (
              <button
                type='button'
                tabIndex={-1}
                disabled={titleFetchStatus !== 'found'}
                title={
                  titleFetchStatus === 'found'
                    ? `帶入：${suggestedTitle}`
                    : titleFetchStatus === 'loading'
                      ? '正在取得網頁標題...'
                      : '無法取得網頁標題'
                }
                onClick={() =>
                  setNewWebsite(prev => ({
                    ...prev,
                    title: suggestedTitle,
                  }))
                }
                className={`shrink-0 rounded-lg p-2 transition-colors ${
                  titleFetchStatus === 'found'
                    ? 'text-primary hover:bg-primary/10'
                    : 'text-muted-foreground cursor-not-allowed'
                }`}
              >
                <Wand2 size={16} />
              </button>
            )}
            <button
              type='button'
              onClick={addWebsite}
              className='text-primary hover:bg-primary/10 shrink-0 rounded-lg p-2 transition-colors'
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
