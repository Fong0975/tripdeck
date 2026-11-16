import { type FormEvent, useState } from 'react';

import Modal from '@/components/ui/Modal';
import ModalFooterActions from '@/components/ui/ModalFooterActions';
import {
  DEFAULT_EXPORT_OPTIONS,
  type ExportOptions,
} from '@/utils/exportToDocx/exportOptions';

import TimelineOptionsSection from './TimelineOptionsSection';

interface Props {
  onClose: () => void;
  /** Called with the chosen settings when the user confirms the export. */
  onConfirm: (options: ExportOptions) => void;
}

/**
 * Dialog for choosing what the Word export contains. Each group of settings is
 * its own section, so a new option only adds a field to `ExportOptions` and a
 * section here.
 */
export default function ExportOptionsModal({ onClose, onConfirm }: Props) {
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onConfirm(options);
  };

  return (
    <Modal title='匯出設定' onClose={onClose} scrollable>
      <form onSubmit={handleSubmit} className='space-y-4'>
        <TimelineOptionsSection
          value={options.timeline}
          onChange={timeline => setOptions({ ...options, timeline })}
        />
        <ModalFooterActions onCancel={onClose} submitLabel='匯出' />
      </form>
    </Modal>
  );
}
