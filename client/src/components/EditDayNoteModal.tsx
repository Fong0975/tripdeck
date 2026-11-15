import { useState } from 'react';

import { LABEL_CLS, TEXTAREA_CLS } from '@/components/ui/formStyles';
import { useEntityImages } from '@/hooks/useEntityImages';
import { useSubmitting } from '@/hooks/useSubmitting';
import type { DayPlan } from '@/types';
import { deleteDayImage, uploadDayImage } from '@/utils/storage';

import ImageUploadSection from './ImageUploadSection';
import Modal from './ui/Modal';
import ModalFooterActions from './ui/ModalFooterActions';

interface Props {
  tripId: number;
  day: DayPlan;
  onClose: () => void;
  /** Return the save promise so the modal can block repeat submits until it settles. */
  onSave: (notes: string | null) => Promise<void> | void;
  /** Called after each image upload/delete, which persists immediately even if the modal is later cancelled. */
  onImagesChanged?: () => void;
}

export default function EditDayNoteModal({
  tripId,
  day,
  onClose,
  onSave,
  onImagesChanged,
}: Props) {
  const [notes, setNotes] = useState(day.notes ?? '');
  const {
    images,
    handleUpload: handleUploadImage,
    handleDelete: handleDeleteImage,
  } = useEntityImages({
    initialImages: day.images ?? [],
    upload: (file, title) => uploadDayImage(tripId, day.id, file, title),
    remove: imageId => deleteDayImage(tripId, day.id, imageId),
    onImagesChanged,
  });
  const { submitting, run } = useSubmitting();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(() => onSave(notes.trim() || null));
  };

  return (
    <Modal title={`第 ${day.day} 天備註`} onClose={onClose} scrollable>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className={LABEL_CLS}>備註</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder='這天的備註...'
            rows={4}
            className={TEXTAREA_CLS}
          />
        </div>

        <div>
          <label className={LABEL_CLS}>圖片</label>
          <ImageUploadSection
            images={images}
            onUpload={handleUploadImage}
            onDelete={handleDeleteImage}
          />
        </div>

        <ModalFooterActions onCancel={onClose} submitting={submitting} />
      </form>
    </Modal>
  );
}
