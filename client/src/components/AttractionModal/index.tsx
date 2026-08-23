import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

import { INPUT_CLS } from '@/components/formStyles';
import { useEntityImages } from '@/hooks/useEntityImages';
import type { Attraction } from '@/types';
import { deleteAttractionImage, uploadAttractionImage } from '@/utils/storage';

import ImageUploadSection from '../ImageUploadSection';
import MarkdownField from '../MarkdownField';
import ConfirmDialog from '../ui/ConfirmDialog';
import Modal from '../ui/Modal';
import ModalFooterActions from '../ui/ModalFooterActions';

import ReferenceWebsitesEditor from './ReferenceWebsitesEditor';
import StagedImageUploader from './StagedImageUploader';

interface Props {
  tripId?: number;
  attraction?: Attraction;
  onClose: () => void;
  onSave: (
    attraction: Attraction,
    stagedImages?: { file: File; title: string }[],
  ) => void;
}

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
  const [stagedImages, setStagedImages] = useState<
    { file: File; title: string }[]
  >([]);
  const [error, setError] = useState('');
  const [hasWebsiteDraft, setHasWebsiteDraft] = useState(false);
  const [pendingAction, setPendingAction] = useState<'close' | 'save' | null>(
    null,
  );

  const set = (key: keyof Attraction, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const doSave = () => {
    onSave(
      { ...form, name: form.name.trim(), images },
      isEditing ? undefined : stagedImages,
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      return setError('請輸入景點名稱');
    }
    if (hasWebsiteDraft) {
      return setPendingAction('save');
    }
    doSave();
  };

  const handleClose = () => {
    if (hasWebsiteDraft) {
      return setPendingAction('close');
    }
    onClose();
  };

  const isEditing = Boolean(attraction?.id);

  return (
    <>
      <Modal
        title={attraction ? '編輯景點' : '新增景點'}
        onClose={handleClose}
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

          <ReferenceWebsitesEditor
            websites={form.referenceWebsites ?? []}
            onChange={websites => set('referenceWebsites', websites)}
            onDraftChange={setHasWebsiteDraft}
          />

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
              <StagedImageUploader onImagesChange={setStagedImages} />
            )}
          </div>

          {error && <p className='text-destructive text-sm'>{error}</p>}

          <ModalFooterActions onCancel={handleClose} />
        </form>
      </Modal>

      {pendingAction && (
        <ConfirmDialog
          title='尚有未加入的參考網站'
          message={
            pendingAction === 'save'
              ? '您輸入的參考網站尚未點選「+」加入，儲存後將不會包含此網站。是否要捨棄並繼續儲存？'
              : '您輸入的參考網站尚未點選「+」加入，離開後將不會保留。是否要捨棄並離開？'
          }
          confirmLabel={pendingAction === 'save' ? '捨棄並儲存' : '捨棄並離開'}
          cancelLabel='返回修改'
          onCancel={() => setPendingAction(null)}
          onConfirm={() => {
            setPendingAction(null);
            if (pendingAction === 'save') {
              doSave();
            } else {
              onClose();
            }
          }}
        />
      )}
    </>
  );
}
