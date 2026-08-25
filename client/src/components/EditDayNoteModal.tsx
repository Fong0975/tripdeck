import { useState } from 'react';

import { useEntityImages } from '@/hooks/useEntityImages';
import type { DayPlan } from '@/types';
import { deleteDayImage, uploadDayImage } from '@/utils/storage';

import ImageUploadSection from './ImageUploadSection';
import Modal from './ui/Modal';
import ModalFooterActions from './ui/ModalFooterActions';

interface Props {
  tripId: number;
  day: DayPlan;
  onClose: () => void;
  onSave: (notes: string | null) => void;
}

export default function EditDayNoteModal({
  tripId,
  day,
  onClose,
  onSave,
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(notes.trim() || null);
  };

  return (
    <Modal title={`第 ${day.day} 天備註`} onClose={onClose} scrollable>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='text-foreground mb-1.5 block text-sm font-medium'>
            備註
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder='這天的備註...'
            rows={4}
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

        <ModalFooterActions onCancel={onClose} />
      </form>
    </Modal>
  );
}
