import { useState } from 'react';

import { showToast } from '@/lib/toast';
import type { AttractionImage, Trip } from '@/types';
import { createTrip, uploadTripImage } from '@/utils/storage';

import StagedImageUploader from './StagedImageUploader';
import Modal from './ui/Modal';
import ModalFooterActions from './ui/ModalFooterActions';

interface Props {
  onClose: () => void;
  onAdded: (trip: Trip) => void;
}

export default function AddTripModal({ onClose, onAdded }: Props) {
  const [form, setForm] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    description: '',
  });
  const [stagedImages, setStagedImages] = useState<
    { file: File; title: string }[]
  >([]);
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'startDate' && value) {
        const end = new Date(value);
        end.setDate(end.getDate() + 3);
        updated.endDate = end.toISOString().slice(0, 10);
      }
      return updated;
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      return setError('請輸入旅程名稱');
    }
    if (!form.startDate || !form.endDate) {
      return setError('請選擇旅遊期間');
    }
    if (form.endDate < form.startDate) {
      return setError('結束日期不能早於開始日期');
    }

    try {
      const trip = await createTrip({
        title: form.title.trim(),
        destination: form.destination.trim() || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description.trim() || undefined,
      });

      const images: AttractionImage[] = [];
      for (const { file, title } of stagedImages) {
        images.push(await uploadTripImage(trip.id, file, title));
      }

      onAdded({ ...trip, images });
      showToast('success', '已建立旅程。');
    } catch {
      showToast('error', '建立旅程失敗，請稍後再試');
    }
  };

  return (
    <Modal title='新增旅程' onClose={onClose}>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='text-foreground mb-1.5 block text-sm font-medium'>
            旅程名稱 *
          </label>
          <input
            name='title'
            value={form.title}
            onChange={handleChange}
            placeholder='例：東京五日遊'
            className='border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/50 w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2'
          />
        </div>

        <div>
          <label className='text-foreground mb-1.5 block text-sm font-medium'>
            目的地
          </label>
          <input
            name='destination'
            value={form.destination}
            onChange={handleChange}
            placeholder='例：日本東京'
            className='border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/50 w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2'
          />
        </div>

        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label className='text-foreground mb-1.5 block text-sm font-medium'>
              開始日期 *
            </label>
            <input
              type='date'
              name='startDate'
              value={form.startDate}
              onChange={handleChange}
              className='border-border bg-background text-foreground focus:border-primary focus:ring-primary/50 w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2'
            />
          </div>
          <div>
            <label className='text-foreground mb-1.5 block text-sm font-medium'>
              結束日期 *
            </label>
            <input
              type='date'
              name='endDate'
              value={form.endDate}
              onChange={handleChange}
              min={form.startDate}
              className='border-border bg-background text-foreground focus:border-primary focus:ring-primary/50 w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2'
            />
          </div>
        </div>

        <div>
          <label className='text-foreground mb-1.5 block text-sm font-medium'>
            備註
          </label>
          <textarea
            name='description'
            value={form.description}
            onChange={handleChange}
            placeholder='旅程相關備註...'
            rows={3}
            className='border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/50 w-full resize-none rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2'
          />
        </div>

        <div>
          <label className='text-foreground mb-1.5 block text-sm font-medium'>
            圖片
          </label>
          <StagedImageUploader onImagesChange={setStagedImages} />
        </div>

        {error && <p className='text-destructive text-sm'>{error}</p>}

        <ModalFooterActions onCancel={onClose} submitLabel='建立旅程' />
      </form>
    </Modal>
  );
}
