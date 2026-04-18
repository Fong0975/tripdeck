import { X, Plus, Trash2, ExternalLink, Wand2, ImagePlus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import type { Attraction, AttractionImage, ReferenceWebsite } from '@/types';
import { deleteAttractionImage, uploadAttractionImage } from '@/utils/storage';

import ImageUploadSection from './ImageUploadSection';
import MarkdownContent from './MarkdownContent';

interface StagedImage {
  localId: string;
  file: File;
  title: string;
  previewUrl: string;
}

interface Props {
  tripId?: number;
  attraction?: Attraction;
  onClose: () => void;
  onSave: (
    attraction: Attraction,
    stagedImages?: { file: File; title: string }[],
  ) => void;
}

const INPUT_CLS =
  'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors';

const decodeHtmlEntities = (str: string): string => {
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value.replace(/\s+/g, ' ').trim();
};

const generateId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

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
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingTitle, setPendingTitle] = useState('');
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [stagingError, setStagingError] = useState('');
  const stageFileInputRef = useRef<HTMLInputElement>(null);
  const [newWebsite, setNewWebsite] = useState<ReferenceWebsite>({
    url: '',
    title: '',
  });
  const [suggestedTitle, setSuggestedTitle] = useState('');
  const [titleFetchStatus, setTitleFetchStatus] = useState<
    'idle' | 'loading' | 'found' | 'not-found'
  >('idle');
  const [error, setError] = useState('');
  const [notesTab, setNotesTab] = useState<'edit' | 'preview'>('edit');
  const [nearbyTab, setNearbyTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    return () => {
      stagedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      if (pendingPreview) {
        URL.revokeObjectURL(pendingPreview);
      }
    };
    // Only run on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      return;
    }
    if (pendingPreview) {
      URL.revokeObjectURL(pendingPreview);
    }
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    setPendingTitle('');
    setStagingError('');
    if (stageFileInputRef.current) {
      stageFileInputRef.current.value = '';
    }
  };

  const clearPendingStage = () => {
    setPendingFile(null);
    setPendingTitle('');
    setStagingError('');
    if (pendingPreview) {
      URL.revokeObjectURL(pendingPreview);
      setPendingPreview(null);
    }
  };

  const confirmStage = () => {
    if (!pendingFile || !pendingPreview) {
      return;
    }
    const title = pendingTitle.trim();
    if (!title) {
      setStagingError('請輸入圖片標題');
      return;
    }
    setStagedImages(prev => [
      ...prev,
      {
        localId: generateId(),
        file: pendingFile,
        title,
        previewUrl: pendingPreview,
      },
    ]);
    setPendingFile(null);
    setPendingTitle('');
    setPendingPreview(null);
    setStagingError('');
  };

  const removeStagedImage = (localId: string) => {
    setStagedImages(prev => {
      const target = prev.find(i => i.localId === localId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(i => i.localId !== localId);
    });
  };

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
    setTitleFetchStatus('idle');
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
    onSave(
      { ...form, name: form.name.trim(), images },
      isEditing
        ? undefined
        : stagedImages.map(({ file, title }) => ({ file, title })),
    );
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
                  tabIndex={-1}
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
                  tabIndex={-1}
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
                  tabIndex={-1}
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
            <div className='mb-1.5 flex items-center justify-between'>
              <label className='text-foreground text-sm font-medium'>
                附近景點
              </label>
              <div className='border-border flex overflow-hidden rounded-md border text-xs'>
                <button
                  type='button'
                  tabIndex={-1}
                  onClick={() => setNearbyTab('edit')}
                  className={`px-2.5 py-0.5 transition-colors ${
                    nearbyTab === 'edit'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  編輯
                </button>
                <button
                  type='button'
                  tabIndex={-1}
                  onClick={() => setNearbyTab('preview')}
                  className={`px-2.5 py-0.5 transition-colors ${
                    nearbyTab === 'preview'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  預覽
                </button>
              </div>
            </div>
            {nearbyTab === 'edit' ? (
              <textarea
                value={form.nearbyAttractions ?? ''}
                onChange={e => set('nearbyAttractions', e.target.value)}
                placeholder='附近可順遊的景點... (支援 Markdown 語法)'
                rows={2}
                className={`${INPUT_CLS} resize-none font-mono text-sm`}
              />
            ) : (
              <div className='border-border bg-background text-foreground min-h-16 rounded-lg border px-3 py-2 text-sm'>
                {form.nearbyAttractions?.trim() ? (
                  <MarkdownContent>{form.nearbyAttractions}</MarkdownContent>
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

          <div>
            <label className='text-foreground mb-1.5 block text-sm font-medium'>
              圖片
            </label>
            {isEditing ? (
              <ImageUploadSection
                images={images}
                onUpload={handleUploadImage}
                onDelete={handleDeleteImage}
              />
            ) : (
              <div className='space-y-3'>
                {stagedImages.length > 0 && (
                  <div className='grid grid-cols-2 gap-2'>
                    {stagedImages.map(img => (
                      <div
                        key={img.localId}
                        className='border-border group relative overflow-hidden rounded-lg border'
                      >
                        <img
                          src={img.previewUrl}
                          alt={img.title}
                          className='h-24 w-full object-cover'
                        />
                        <div className='absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100'>
                          <p className='truncate text-xs font-medium text-white'>
                            {img.title}
                          </p>
                        </div>
                        <button
                          type='button'
                          tabIndex={-1}
                          onClick={() => removeStagedImage(img.localId)}
                          className='hover:bg-destructive absolute right-1 top-1 rounded-md bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100'
                          title='移除圖片'
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {pendingFile ? (
                  <div className='border-border space-y-2 rounded-lg border border-dashed p-3'>
                    {pendingPreview && (
                      <div className='relative'>
                        <img
                          src={pendingPreview}
                          alt='預覽'
                          className='h-32 w-full rounded-lg object-cover'
                        />
                        <button
                          type='button'
                          tabIndex={-1}
                          onClick={clearPendingStage}
                          className='absolute right-1 top-1 rounded-md bg-black/50 p-1 text-white hover:bg-black/70'
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <input
                      value={pendingTitle}
                      onChange={e => {
                        setPendingTitle(e.target.value);
                        setStagingError('');
                      }}
                      placeholder='圖片標題（必填）'
                      className='border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/50 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2'
                    />
                    {stagingError && (
                      <p className='text-destructive text-xs'>{stagingError}</p>
                    )}
                    <button
                      type='button'
                      onClick={confirmStage}
                      className='bg-primary text-primary-foreground w-full rounded-lg py-2 text-sm font-medium transition-all hover:opacity-90'
                    >
                      加入圖片
                    </button>
                  </div>
                ) : (
                  <button
                    type='button'
                    onClick={() => stageFileInputRef.current?.click()}
                    className='border-border text-muted-foreground hover:border-primary/50 hover:text-primary flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-sm transition-colors'
                  >
                    <ImagePlus size={16} />
                    新增圖片
                  </button>
                )}
                <input
                  ref={stageFileInputRef}
                  type='file'
                  accept='image/jpeg,image/png,image/gif,image/webp'
                  onChange={handleStageFileSelect}
                  className='hidden'
                />
              </div>
            )}
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
