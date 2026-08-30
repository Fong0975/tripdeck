import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useState } from 'react';

import { imageCountOf, useDateShrinkImpact } from '@/hooks/useDateShrinkImpact';
import { useEntityImages } from '@/hooks/useEntityImages';
import { showToast } from '@/lib/toast';
import type { Trip, TripContent } from '@/types';
import {
  deleteTripImage,
  getTripContent,
  updateTrip,
  uploadTripImage,
} from '@/utils/storage';

import ImageUploadSection from './ImageUploadSection';
import ConfirmDialog from './ui/ConfirmDialog';
import Modal from './ui/Modal';
import ModalFooterActions from './ui/ModalFooterActions';

interface Props {
  trip: Trip;
  /** Already-loaded content to avoid a redundant fetch (TripDetail has this; Home does not). */
  initialContent?: TripContent | null;
  onClose: () => void;
  onUpdated: (trip: Trip) => void;
  /** Called after a successful update that removed day lanes, so the caller can reload its content. */
  onContentChanged?: () => void;
}

export default function EditTripModal({
  trip,
  initialContent,
  onClose,
  onUpdated,
  onContentChanged,
}: Props) {
  const [form, setForm] = useState({
    title: trip.title,
    destination: trip.destination ?? '',
    startDate: trip.startDate,
    endDate: trip.endDate,
    description: trip.description ?? '',
  });
  const {
    images,
    handleUpload: handleUploadImage,
    handleDelete: handleDeleteImage,
  } = useEntityImages({
    initialImages: trip.images ?? [],
    upload: (file, title) => uploadTripImage(trip.id, file, title),
    remove: imageId => deleteTripImage(trip.id, imageId),
  });
  const [error, setError] = useState('');
  const { pendingImpact, checkImpact, dismissImpact } = useDateShrinkImpact({
    tripStartDate: trip.startDate,
    tripEndDate: trip.endDate,
    getContent: async () => initialContent ?? (await getTripContent(trip.id)),
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const submitUpdate = async () => {
    try {
      const updated = await updateTrip(trip.id, {
        title: form.title.trim(),
        destination: form.destination.trim() || null,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description.trim() || null,
      });
      onUpdated(updated);
      onContentChanged?.();
      showToast('success', '已更新旅程。');
    } catch {
      showToast('error', '更新旅程失敗，請稍後再試');
    }
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

    const canProceed = await checkImpact(form.startDate, form.endDate);
    if (canProceed) {
      return submitUpdate();
    }
  };

  return (
    <>
      <Modal title='編輯旅程' onClose={onClose}>
        <form onSubmit={e => void handleSubmit(e)} className='space-y-4'>
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
            <ImageUploadSection
              images={images}
              onUpload={handleUploadImage}
              onDelete={handleDeleteImage}
            />
          </div>

          {error && <p className='text-destructive text-sm'>{error}</p>}

          <ModalFooterActions onCancel={onClose} />
        </form>
      </Modal>

      {pendingImpact && (
        <ConfirmDialog
          title='調整日期後將刪除部份行程內容'
          message={
            <div className='space-y-2 text-left'>
              <p>以下日期不在新的旅遊期間內，其行程資料將被永久刪除：</p>
              <ul className='list-disc space-y-1 pl-5'>
                {pendingImpact.map(day => (
                  <li key={day.id}>
                    {format(parseISO(day.date), 'M/d', { locale: zhTW })}
                    （第 {day.day} 天）：{day.attractions.length} 個景點、
                    {imageCountOf(day)} 張圖片、{day.connections.length}{' '}
                    筆交通紀錄
                  </li>
                ))}
              </ul>
            </div>
          }
          confirmLabel='確定刪除並儲存'
          cancelLabel='返回修改'
          onCancel={dismissImpact}
          onConfirm={() => {
            dismissImpact();
            void submitUpdate();
          }}
        />
      )}
    </>
  );
}
