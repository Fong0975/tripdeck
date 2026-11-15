import { useState } from 'react';

import { LABEL_CLS } from '@/components/ui/formStyles';
import { showToast } from '@/components/ui/toast';
import { useSubmitting } from '@/hooks/useSubmitting';
import type { Trip } from '@/types';
import {
  showSavedToast,
  uploadStagedImages,
  type StagedImage,
} from '@/utils/stagedImages';
import { createTrip, uploadTripImage } from '@/utils/storage';

import StagedImageUploader from './StagedImageUploader';
import TripFormFields from './TripForm/TripFormFields';
import { useTripForm } from './TripForm/useTripForm';
import type { TripFormValues } from './TripForm/validateTripForm';
import Modal from './ui/Modal';
import ModalFooterActions from './ui/ModalFooterActions';

interface Props {
  onClose: () => void;
  onAdded: (trip: Trip) => void;
}

const EMPTY_TRIP_FORM: TripFormValues = {
  title: '',
  destination: '',
  startDate: '',
  endDate: '',
  description: '',
};

/** Modal for creating a new trip, with images staged locally until the trip exists. */
export default function AddTripModal({ onClose, onAdded }: Props) {
  const tripForm = useTripForm(EMPTY_TRIP_FORM, { autoFillEndDate: true });
  const { values: form, error, handleChange, validate } = tripForm;
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const { submitting, run } = useSubmitting();

  const createWithImages = async () => {
    let trip: Trip;
    try {
      trip = await createTrip({
        title: form.title.trim(),
        destination: form.destination.trim() || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        description: form.description.trim() || undefined,
      });
    } catch {
      showToast('error', '建立旅程失敗，請稍後再試');
      return;
    }

    const { uploaded, failedCount } = await uploadStagedImages(
      stagedImages,
      (file, title) => uploadTripImage(trip.id, file, title),
    );
    onAdded({ ...trip, images: uploaded });
    showSavedToast('已建立旅程。', failedCount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }
    void run(createWithImages);
  };

  return (
    <Modal title='新增旅程' onClose={onClose}>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <TripFormFields values={form} onChange={handleChange} />

        <div>
          <label className={LABEL_CLS}>圖片</label>
          <StagedImageUploader onImagesChange={setStagedImages} />
        </div>

        {error && <p className='text-sm text-destructive'>{error}</p>}

        <ModalFooterActions
          onCancel={onClose}
          submitLabel='建立旅程'
          submitting={submitting}
          submittingLabel='建立中…'
        />
      </form>
    </Modal>
  );
}
