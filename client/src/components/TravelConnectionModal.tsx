import { useState } from 'react';

import { INPUT_CLS } from '@/components/ui/formStyles';
import { TRANSPORT_MODE_OPTIONS } from '@/constants/transportModes';
import { useEntityImages } from '@/hooks/useEntityImages';
import { useSubmitting } from '@/hooks/useSubmitting';
import type { TravelConnection } from '@/types';
import { parseDurationMinutes } from '@/utils/duration';
import type { StagedImage } from '@/utils/stagedImages';
import { deleteConnectionImage, uploadConnectionImage } from '@/utils/storage';

import DurationInput from './DurationInput';
import ImageUploadSection from './ImageUploadSection';
import MarkdownField from './MarkdownField';
import StagedImageUploader from './StagedImageUploader';
import Modal from './ui/Modal';
import ModalFooterActions from './ui/ModalFooterActions';

interface Props {
  tripId?: number;
  connection: TravelConnection;
  fromName: string;
  toName: string;
  onClose: () => void;
  /** Return the save promise so the modal can block repeat submits until it settles. */
  onSave: (
    connection: TravelConnection,
    stagedImages?: StagedImage[],
  ) => Promise<void> | void;
  /** Called after each image upload/delete, which persists immediately even if the modal is later cancelled. */
  onImagesChanged?: () => void;
}

export default function TravelConnectionModal({
  tripId,
  connection,
  fromName,
  toName,
  onClose,
  onSave,
  onImagesChanged,
}: Props) {
  const [form, setForm] = useState<TravelConnection>({ ...connection });
  const connectionId = connection.id;
  const {
    images,
    handleUpload: handleUploadImage,
    handleDelete: handleDeleteImage,
  } = useEntityImages({
    initialImages: connection.images ?? [],
    upload:
      tripId && connectionId
        ? (file, title) =>
            uploadConnectionImage(tripId, connectionId, file, title)
        : undefined,
    remove:
      tripId && connectionId
        ? imageId => deleteConnectionImage(tripId, connectionId, imageId)
        : undefined,
    onImagesChanged,
  });
  const [durationMinutes, setDurationMinutes] = useState(
    () => parseDurationMinutes(connection.duration) ?? 0,
  );
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const { submitting, run } = useSubmitting();

  const set = (key: keyof TravelConnection, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const isEditing = connection.id > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(() =>
      onSave(
        {
          ...form,
          duration: durationMinutes > 0 ? String(durationMinutes) : null,
          images,
        },
        isEditing ? undefined : stagedImages,
      ),
    );
  };

  return (
    <Modal title='移動資訊' onClose={onClose} maxWidth='max-w-md' scrollable>
      <div className='mb-6 flex items-center gap-2 text-sm'>
        <span className='max-w-[130px] truncate rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary'>
          {fromName}
        </span>
        <span className='text-muted-foreground'>→</span>
        <span className='max-w-[130px] truncate rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary'>
          {toName}
        </span>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='mb-2 block text-sm font-medium text-foreground'>
            交通方式
          </label>
          <div className='grid grid-cols-3 gap-2'>
            {TRANSPORT_MODE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type='button'
                onClick={() => set('transportMode', opt.value)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-all ${
                  form.transportMode === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-accent'
                }`}
              >
                <span className='text-xl'>{opt.icon}</span>
                <span className='text-xs font-medium'>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <DurationInput value={durationMinutes} onChange={setDurationMinutes} />

        <MarkdownField
          label='路線說明'
          value={form.route ?? ''}
          onChange={v => set('route', v)}
          placeholder='例：搭乘銀座線至上野站...（支援 Markdown 語法）'
          rows={4}
          previewMinHeight='min-h-24'
        />

        <div>
          <label className='mb-1.5 block text-sm font-medium text-foreground'>
            備註
          </label>
          <textarea
            value={form.notes ?? ''}
            onChange={e => set('notes', e.target.value)}
            placeholder='其他注意事項...'
            rows={3}
            className={`${INPUT_CLS} resize-none`}
          />
        </div>

        <div>
          <label className='mb-1.5 block text-sm font-medium text-foreground'>
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

        <ModalFooterActions onCancel={onClose} submitting={submitting} />
      </form>
    </Modal>
  );
}
