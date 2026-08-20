import { Plus, Trash2, ExternalLink, Wand2, ImagePlus, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { useEntityImages } from '@/hooks/useEntityImages';
import type { Attraction, ReferenceWebsite } from '@/types';
import { deleteAttractionImage, uploadAttractionImage } from '@/utils/storage';

import ImageUploadSection from './ImageUploadSection';
import MarkdownField from './MarkdownField';
import Modal from './ui/Modal';
import ModalFooterActions from './ui/ModalFooterActions';

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
  const attractionId = attraction?.id;
  const {
    images,
    handleUpload: handleUploadImage,
    handleDelete: handleDeleteImage,
  } = useEntityImages({
    initialImages: attraction?.images ?? [],
    upload:
      tripId && attractionId
        ? (file, title) =>
            uploadAttractionImage(tripId, attractionId, file, title)
        : undefined,
    remove:
      tripId && attractionId
        ? imageId => deleteAttractionImage(tripId, attractionId, imageId)
        : undefined,
  });
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
    <Modal
      title={attraction ? '編輯景點' : '新增景點'}
      onClose={onClose}
      maxWidth='max-w-lg'
      scrollable
    >
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

        <MarkdownField
          label='補充資訊'
          value={form.notes ?? ''}
          onChange={v => set('notes', v)}
          placeholder='票價、開放時間、注意事項... (支援 Markdown 語法)'
          rows={4}
          previewMinHeight='min-h-24'
        />

        <MarkdownField
          label='附近景點'
          value={form.nearbyAttractions ?? ''}
          onChange={v => set('nearbyAttractions', v)}
          placeholder='附近可順遊的景點... (支援 Markdown 語法)'
          rows={6}
          previewMinHeight='min-h-48'
        />

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

        <ModalFooterActions onCancel={onClose} />
      </form>
    </Modal>
  );
}
