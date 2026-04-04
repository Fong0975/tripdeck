import { X, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useState } from 'react';

import type { Attraction } from '@/types';

interface Props {
  attraction?: Attraction;
  onClose: () => void;
  onSave: (attraction: Attraction) => void;
}

const INPUT_CLS =
  'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors';

const empty: Attraction = {
  id: 0,
  name: '',
  googleMapUrl: '',
  notes: '',
  nearbyAttractions: '',
  referenceWebsites: [],
};

export default function AttractionModal({
  attraction,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<Attraction>(
    attraction ? { ...attraction } : { ...empty },
  );
  const [newWebsite, setNewWebsite] = useState('');
  const [error, setError] = useState('');

  const set = (key: keyof Attraction, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const addWebsite = () => {
    const url = newWebsite.trim();
    if (!url) {
      return;
    }
    set('referenceWebsites', [...(form.referenceWebsites ?? []), url]);
    setNewWebsite('');
  };

  const removeWebsite = (idx: number) =>
    set(
      'referenceWebsites',
      (form.referenceWebsites ?? []).filter((_, i) => i !== idx),
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      return setError('請輸入景點名稱');
    }
    onSave({ ...form, name: form.name.trim() });
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-black/50 backdrop-blur-sm'
        onClick={onClose}
      />

      <div className='animate-slide-up border-border bg-card relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-2xl'>
        <div className='mb-6 flex items-center justify-between'>
          <h2 className='text-foreground text-xl font-bold'>
            {attraction ? '編輯景點' : '新增景點'}
          </h2>
          <button
            onClick={onClose}
            className='text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-1.5 transition-colors'
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='text-foreground mb-1.5 block text-sm font-medium'>
              景點名稱 *
            </label>
            <input
              value={form.name}
              onChange={e => {
                set('name', e.target.value);
                setError('');
              }}
              placeholder='例：淺草寺'
              className={INPUT_CLS}
            />
          </div>

          <div>
            <label className='text-foreground mb-1.5 block text-sm font-medium'>
              Google Maps 連結
            </label>
            <div className='flex gap-2'>
              <input
                value={form.googleMapUrl ?? ''}
                onChange={e => set('googleMapUrl', e.target.value)}
                placeholder='https://maps.google.com/...'
                className={`${INPUT_CLS} flex-1`}
              />
              {form.googleMapUrl && (
                <a
                  href={form.googleMapUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-primary hover:bg-primary/10 rounded-lg p-2 transition-colors'
                >
                  <ExternalLink size={18} />
                </a>
              )}
            </div>
          </div>

          <div>
            <label className='text-foreground mb-1.5 block text-sm font-medium'>
              補充資訊
            </label>
            <textarea
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              placeholder='票價、開放時間、注意事項...'
              rows={3}
              className={`${INPUT_CLS} resize-none`}
            />
          </div>

          <div>
            <label className='text-foreground mb-1.5 block text-sm font-medium'>
              附近景點
            </label>
            <textarea
              value={form.nearbyAttractions ?? ''}
              onChange={e => set('nearbyAttractions', e.target.value)}
              placeholder='附近可順遊的景點...'
              rows={2}
              className={`${INPUT_CLS} resize-none`}
            />
          </div>

          <div>
            <label className='text-foreground mb-1.5 block text-sm font-medium'>
              參考網站
            </label>
            <div className='space-y-2'>
              {(form.referenceWebsites ?? []).map((url, idx) => (
                <div key={idx} className='flex items-center gap-2'>
                  <a
                    href={url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-primary flex-1 truncate text-sm hover:underline'
                  >
                    {url}
                  </a>
                  <button
                    type='button'
                    onClick={() => removeWebsite(idx)}
                    className='text-muted-foreground hover:text-destructive p-1 transition-colors'
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className='flex gap-2'>
                <input
                  value={newWebsite}
                  onChange={e => setNewWebsite(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addWebsite();
                    }
                  }}
                  placeholder='https://...'
                  className={`${INPUT_CLS} flex-1 text-sm`}
                />
                <button
                  type='button'
                  onClick={addWebsite}
                  className='text-primary hover:bg-primary/10 rounded-lg p-2 transition-colors'
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          {error && <p className='text-destructive text-sm'>{error}</p>}

          <div className='flex gap-3 pt-2'>
            <button
              type='button'
              onClick={onClose}
              className='border-border text-foreground hover:bg-accent flex-1 rounded-xl border px-4 py-2 transition-colors'
            >
              取消
            </button>
            <button
              type='submit'
              className='bg-primary text-primary-foreground flex-1 rounded-xl px-4 py-2 font-medium transition-all hover:opacity-90 active:scale-95'
            >
              儲存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
