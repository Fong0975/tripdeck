import { X } from 'lucide-react';
import { useState } from 'react';

import type { TravelConnection, TransportMode, AttractionImage } from '@/types';
import { parseDurationMinutes } from '@/utils/duration';
import { deleteConnectionImage, uploadConnectionImage } from '@/utils/storage';

import ImageUploadSection from './ImageUploadSection';
import MarkdownContent from './MarkdownContent';

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

const INPUT_CLS =
  'border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/50 w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2';

export default function TravelConnectionModal({
  tripId,
  connection,
  fromName,
  toName,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<TravelConnection>({ ...connection });
  const [images, setImages] = useState<AttractionImage[]>(
    connection.images ?? [],
  );
  const initialDurationMinutes = parseDurationMinutes(connection.duration) ?? 0;
  const [hours, setHours] = useState(Math.floor(initialDurationMinutes / 60));
  const [minutes, setMinutes] = useState(initialDurationMinutes % 60);
  const [routeTab, setRouteTab] = useState<'edit' | 'preview'>('edit');

  const set = (key: keyof TravelConnection, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleUploadImage = async (file: File, title: string) => {
    if (!tripId || !connection.id) {
      return;
    }
    const image = await uploadConnectionImage(
      tripId,
      connection.id,
      file,
      title,
    );
    setImages(prev => [...prev, image]);
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!tripId || !connection.id) {
      return;
    }
    await deleteConnectionImage(tripId, connection.id, imageId);
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

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
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-black/50 backdrop-blur-sm'
        onClick={onClose}
      />

      <div className='animate-slide-up border-border bg-card relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-6 shadow-2xl'>
        <div className='mb-6 flex items-center justify-between'>
          <h2 className='text-foreground text-xl font-bold'>移動資訊</h2>
          <button
            onClick={onClose}
            className='text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-1.5 transition-colors'
          >
            <X size={20} />
          </button>
        </div>

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
                onChange={e =>
                  setHours(Math.max(0, Number(e.target.value) || 0))
                }
                className={INPUT_CLS}
              />
              <span className='text-muted-foreground shrink-0 text-sm'>
                小時
              </span>
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
              <span className='text-muted-foreground shrink-0 text-sm'>
                分鐘
              </span>
            </div>
          </div>

          <div>
            <div className='mb-1.5 flex items-center justify-between'>
              <label className='text-foreground text-sm font-medium'>
                路線說明
              </label>
              <div className='border-border flex overflow-hidden rounded-md border text-xs'>
                <button
                  type='button'
                  tabIndex={-1}
                  onClick={() => setRouteTab('edit')}
                  className={`px-2.5 py-0.5 transition-colors ${
                    routeTab === 'edit'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  編輯
                </button>
                <button
                  type='button'
                  tabIndex={-1}
                  onClick={() => setRouteTab('preview')}
                  className={`px-2.5 py-0.5 transition-colors ${
                    routeTab === 'preview'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  預覽
                </button>
              </div>
            </div>
            {routeTab === 'edit' ? (
              <textarea
                value={form.route ?? ''}
                onChange={e => set('route', e.target.value)}
                placeholder='例：搭乘銀座線至上野站...（支援 Markdown 語法）'
                rows={4}
                className={`${INPUT_CLS} resize-none font-mono text-sm`}
              />
            ) : (
              <div className='border-border bg-background text-foreground min-h-24 rounded-lg border px-3 py-2 text-sm'>
                {form.route?.trim() ? (
                  <MarkdownContent>{form.route}</MarkdownContent>
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
