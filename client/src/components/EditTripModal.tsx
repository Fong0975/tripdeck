import { format, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale/zh-TW';

import { LABEL_CLS } from '@/components/formStyles';
import { imageCountOf, useDateShrinkImpact } from '@/hooks/useDateShrinkImpact';
import { useEntityImages } from '@/hooks/useEntityImages';
import { useSubmitting } from '@/hooks/useSubmitting';
import { showToast } from '@/lib/toast';
import type { Trip, TripContent } from '@/types';
import {
  deleteTripImage,
  getTripContent,
  updateTrip,
  uploadTripImage,
} from '@/utils/storage';

import ImageUploadSection from './ImageUploadSection';
import TripFormFields from './TripForm/TripFormFields';
import { useTripForm } from './TripForm/useTripForm';
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
  /** Called after each image upload/delete, which persists immediately even if the modal is later cancelled. */
  onImagesChanged?: () => void;
}

export default function EditTripModal({
  trip,
  initialContent,
  onClose,
  onUpdated,
  onContentChanged,
  onImagesChanged,
}: Props) {
  const {
    values: form,
    error,
    handleChange,
    validate,
  } = useTripForm({
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
    onImagesChanged,
  });
  const { submitting, run } = useSubmitting();
  const { pendingImpact, checkImpact, dismissImpact } = useDateShrinkImpact({
    tripStartDate: trip.startDate,
    tripEndDate: trip.endDate,
    getContent: async () => initialContent ?? (await getTripContent(trip.id)),
  });

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

  const validateAndSubmit = async () => {
    if (!validate()) {
      return;
    }

    const canProceed = await checkImpact(form.startDate, form.endDate);
    if (canProceed) {
      await submitUpdate();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(validateAndSubmit);
  };

  return (
    <>
      <Modal title='編輯旅程' onClose={onClose}>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <TripFormFields values={form} onChange={handleChange} />

          <div>
            <label className={LABEL_CLS}>圖片</label>
            <ImageUploadSection
              images={images}
              onUpload={handleUploadImage}
              onDelete={handleDeleteImage}
            />
          </div>

          {error && <p className='text-sm text-destructive'>{error}</p>}

          <ModalFooterActions onCancel={onClose} submitting={submitting} />
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
            void run(submitUpdate);
          }}
        />
      )}
    </>
  );
}
