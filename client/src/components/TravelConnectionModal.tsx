import { useState } from 'react';

import { INPUT_CLS } from '@/components/formStyles';
import { useEntityImages } from '@/hooks/useEntityImages';
import type { TravelConnection, TransportMode } from '@/types';
import { parseDurationMinutes } from '@/utils/duration';
import { deleteConnectionImage, uploadConnectionImage } from '@/utils/storage';

import ImageUploadSection from './ImageUploadSection';
import MarkdownField from './MarkdownField';
import Modal from './ui/Modal';
import ModalFooterActions from './ui/ModalFooterActions';

interface Props {
  tripId?: number;
  connection: TravelConnection;
  fromName: string;
  toName: string;
  onClose: () => void;
  onSave: (connection: TravelConnection) => void;
}

const TRANSPORT_OPTIONS: {
  value: TransportMode;
  label: string;
  icon: string;
}[] = [
  { value: 'walk', label: '步行', icon: '🚶' },
  { value: 'transit', label: '大眾運輸', icon: '🚇' },
  { value: 'drive', label: '開車', icon: '🚗' },
  { value: 'bike', label: '騎車', icon: '🚲' },
  { value: 'taxi', label: '計程車', icon: '🚕' },
  { value: 'flight', label: '飛機', icon: '✈️' },
  { value: 'other', label: '其他', icon: '🗺️' },
];

export default function TravelConnectionModal({
  tripId,
  connection,
  fromName,
  toName,
  onClose,
  onSave,
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
  });
  const initialDurationMinutes = parseDurationMinutes(connection.duration) ?? 0;
  const [hours, setHours] = useState(Math.floor(initialDurationMinutes / 60));
  const [minutes, setMinutes] = useState(initialDurationMinutes % 60);

  const set = (key: keyof TravelConnection, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalMinutes = hours * 60 + minutes;
    onSave({
      ...form,
      duration: totalMinutes > 0 ? String(totalMinutes) : null,
      images,
    });
  };

  const isEditing = connection.id > 0;

  return (
    <Modal title='移動資訊' onClose={onClose} maxWidth='max-w-md' scrollable>
      <div className='mb-6 flex items-center gap-2 text-sm'>
        <span className='bg-primary/10 text-primary max-w-[130px] truncate rounded-full px-2.5 py-1 font-medium'>
          {fromName}
        </span>
        <span className='text-muted-foreground'>→</span>
        <span className='bg-primary/10 text-primary max-w-[130px] truncate rounded-full px-2.5 py-1 font-medium'>
          {toName}
        </span>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='text-foreground mb-2 block text-sm font-medium'>
            交通方式
          </label>
          <div className='grid grid-cols-3 gap-2'>
            {TRANSPORT_OPTIONS.map(opt => (
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

        <div>
          <label className='text-foreground mb-1.5 block text-sm font-medium'>
            所需時間
          </label>
          <div className='flex items-center gap-2'>
            <input
              type='number'
              inputMode='numeric'
              min={0}
              value={hours}
              onChange={e => setHours(Math.max(0, Number(e.target.value) || 0))}
              className={INPUT_CLS}
            />
            <span className='text-muted-foreground shrink-0 text-sm'>小時</span>
            <input
              type='number'
              inputMode='numeric'
              min={0}
              max={59}
              value={minutes}
              onChange={e =>
                setMinutes(
                  Math.min(59, Math.max(0, Number(e.target.value) || 0)),
                )
              }
              className={INPUT_CLS}
            />
            <span className='text-muted-foreground shrink-0 text-sm'>分鐘</span>
          </div>
        </div>

        <MarkdownField
          label='路線說明'
          value={form.route ?? ''}
          onChange={v => set('route', v)}
          placeholder='例：搭乘銀座線至上野站...（支援 Markdown 語法）'
          rows={4}
          previewMinHeight='min-h-24'
        />

        <div>
          <label className='text-foreground mb-1.5 block text-sm font-medium'>
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

        <ModalFooterActions onCancel={onClose} />
      </form>
    </Modal>
  );
}
