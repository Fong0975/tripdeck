import { X, Plus, Trash2, ExternalLink, Wand2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import type { Attraction, AttractionImage, ReferenceWebsite } from '@/types';
import { deleteAttractionImage, uploadAttractionImage } from '@/utils/storage';

import ImageUploadSection from './ImageUploadSection';
import MarkdownContent from './MarkdownContent';

interface Props {
  tripId?: number;
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
  startTime: '',
  endTime: '',
  referenceWebsites: [],
  images: [],
};

export default function AttractionModal({
  tripId,
  attraction,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<Attraction>(
    attraction ? { ...attraction } : { ...empty },
  );
  const [images, setImages] = useState<AttractionImage[]>(
    attraction?.images ?? [],
  );
  const [newWebsite, setNewWebsite] = useState<ReferenceWebsite>({
    url: '',
    title: '',
  });
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [error, setError] = useState('');
  const [notesTab, setNotesTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    const url = newWebsite.url.trim();
    if (!url) {
      setSuggestedTitle('');
      return;
    }
    setSuggestedTitle('');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const html = await res.text();
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (match?.[1]) {
          setSuggestedTitle(match[1].trim());
        }
      } catch {
        // CORS or network error — silently ignore
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [newWebsite.url]);

  const set = (key: keyof Attraction, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const addWebsite = () => {
    const url = newWebsite.url.trim();
    const title = newWebsite.title.trim();
    if (!url || !title) {
      return;
    }
    set('referenceWebsites', [
      ...(form.referenceWebsites ?? []),
      { url, title },
    ]);
    setNewWebsite({ url: '', title: '' });
    setSuggestedTitle('');
  };

  const removeWebsite = (idx: number) =>
    set(
      'referenceWebsites',
      (form.referenceWebsites ?? []).filter((_, i) => i !== idx),
    );

  const handleUploadImage = async (file: File, title: string) => {
    if (!tripId || !attraction?.id) {
      return;
    }
    const image = await uploadAttractionImage(
      tripId,
      attraction.id,
      file,
      title,
    );
    setImages(prev => [...prev, image]);
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!tripId || !attraction?.id) {
      return;
    }
    await deleteAttractionImage(tripId, attraction.id, imageId);
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      return setError('請輸入景點名稱');
    }
    onSave({ ...form, name: form.name.trim(), images });
  };

  const isEditing = Boolean(attraction?.id);

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

          <div className='flex gap-3'>
            <div className='flex-1'>
              <label className='text-foreground mb-1.5 block text-sm font-medium'>
                開始時間
              </label>
              <input
                type='time'
                value={form.startTime ?? ''}
                onChange={e => set('startTime', e.target.value || null)}
                className={INPUT_CLS}
              />
            </div>
            <div className='flex-1'>
              <label className='text-foreground mb-1.5 block text-sm font-medium'>
                結束時間
              </label>
              <input
                type='time'
                value={form.endTime ?? ''}
                onChange={e => set('endTime', e.target.value || null)}
                className={INPUT_CLS}
              />
            </div>
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
            <div className='mb-1.5 flex items-center justify-between'>
              <label className='text-foreground text-sm font-medium'>
                補充資訊
              </label>
              <div className='border-border flex overflow-hidden rounded-md border text-xs'>
                <button
                  type='button'
                  onClick={() => setNotesTab('edit')}
                  className={`px-2.5 py-0.5 transition-colors ${
                    notesTab === 'edit'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  編輯
                </button>
                <button
                  type='button'
                  onClick={() => setNotesTab('preview')}
                  className={`px-2.5 py-0.5 transition-colors ${
                    notesTab === 'preview'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  預覽
                </button>
              </div>
            </div>
            {notesTab === 'edit' ? (
              <textarea
                value={form.notes ?? ''}
                onChange={e => set('notes', e.target.value)}
                placeholder='票價、開放時間、注意事項... (支援 Markdown 語法)'
                rows={4}
                className={`${INPUT_CLS} resize-none font-mono text-sm`}
              />
            ) : (
              <div className='border-border bg-background text-foreground min-h-24 rounded-lg border px-3 py-2 text-sm'>
                {form.notes?.trim() ? (
                  <MarkdownContent>{form.notes}</MarkdownContent>
                ) : (
                  <span className='text-muted-foreground text-xs'>
                    尚無內容
                  </span>
                )}
              </div>
            )}
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
              {(form.referenceWebsites ?? []).map((site, idx) => (
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
                  {suggestedTitle && (
                    <button
                      type='button'
                      title={`帶入：${suggestedTitle}`}
                      onClick={() =>
                        setNewWebsite(prev => ({
                          ...prev,
                          title: suggestedTitle,
                        }))
                      }
                      className='text-primary hover:bg-primary/10 shrink-0 rounded-lg p-2 transition-colors'
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

          {isEditing && (
            <div>
              <label className='text-foreground mb-1.5 block text-sm font-medium'>
                圖片
              </label>
              <ImageUploadSection
                images={images}
                onUpload={handleUploadImage}
                onDelete={handleDeleteImage}
              />
            </div>
          )}

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
