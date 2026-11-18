import type { LocationLabel } from '@tripdeck/shared';
import { useState } from 'react';

import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import Modal from '@/components/ui/Modal';
import RetryableError from '@/components/ui/RetryableError';

import AddLocationLabelForm from './AddLocationLabelForm';
import LocationLabelRow from './LocationLabelRow';
import { useLocationLabelSet } from './LocationLabelsContext';
import OrphanLocationList from './OrphanLocationList';
import { useLocationLabels } from './useLocationLabels';

interface Props {
  onClose: () => void;
}

/**
 * Modal for managing the storage location labels shared by the checklist
 * template and every trip checklist: add, delete, reorder, choose whether a
 * label is its own group in the "by storage location" view, and add back
 * deleted labels that trips still use.
 */
export default function LocationLabelsModal({ onClose }: Props) {
  const {
    data,
    loadError,
    reload,
    addLabel,
    removeLabel,
    setShowAsGroup,
    moveLabel,
  } = useLocationLabels();
  const { reload: reloadLabelSet } = useLocationLabelSet();
  const [deleting, setDeleting] = useState<LocationLabel | null>(null);

  const handleClose = () => {
    onClose();
    void reloadLabelSet();
  };

  const handleConfirmDelete = async () => {
    const target = deleting;
    setDeleting(null);
    if (target) {
      await removeLabel(target.id);
    }
  };

  const renderBody = () => {
    if (!data) {
      return loadError ? (
        <RetryableError
          message='載入位置標籤失敗，請稍後再試'
          onRetry={() => void reload()}
        />
      ) : (
        <LoadingIndicator />
      );
    }

    const { labels, orphans } = data;
    return (
      <div className='space-y-5'>
        <p className='text-sm text-muted-foreground'>
          位置標籤可在行李項目與規格上複選。刪除標籤不會影響已建立的旅程，但之後無法再為旅程中的項目選用，除非以同名重新新增。
        </p>
        <AddLocationLabelForm
          existingNames={labels.map(label => label.name)}
          onAdd={addLabel}
        />
        {labels.length === 0 ? (
          <p className='py-4 text-center text-sm text-muted-foreground'>
            尚未建立任何位置標籤。
          </p>
        ) : (
          <ul className='space-y-2'>
            {labels.map((label, index) => (
              <LocationLabelRow
                key={label.id}
                label={label}
                isFirst={index === 0}
                isLast={index === labels.length - 1}
                onToggleGroup={value => void setShowAsGroup(label.id, value)}
                onMove={direction => void moveLabel(label.id, direction)}
                onDelete={() => setDeleting(label)}
              />
            ))}
          </ul>
        )}
        <OrphanLocationList
          orphans={orphans}
          onRestore={name => addLabel(name, true)}
        />
      </div>
    );
  };

  return (
    <>
      <Modal
        title='管理行李位置'
        onClose={handleClose}
        maxWidth='max-w-lg'
        scrollable
      >
        {renderBody()}
      </Modal>
      {deleting && (
        <ConfirmDialog
          title={`刪除「${deleting.name}」？`}
          message='行李清單模板中的此位置會一併移除；既有旅程不受影響，仍可使用此位置，但取消後無法再選回。'
          confirmLabel='刪除'
          onCancel={() => setDeleting(null)}
          onConfirm={() => void handleConfirmDelete()}
        />
      )}
    </>
  );
}
