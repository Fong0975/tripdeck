import { useState } from 'react';

import type { Trip } from '@/types';

import Modal from '../ui/Modal';

import AutoBackupsTab from './AutoBackupsTab';
import ExportTab from './ExportTab';
import ImportTab from './ImportTab';

interface Props {
  trips: Trip[];
  onClose: () => void;
  /** Called after at least one trip was successfully imported, so the caller can refresh its trip list. */
  onImported?: () => void;
}

type Tab = 'export' | 'import' | 'auto';

function tabButtonClass(active: boolean): string {
  return `border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? 'border-primary text-primary'
      : 'text-muted-foreground hover:text-foreground border-transparent'
  }`;
}

export default function ImportExportModal({
  trips,
  onClose,
  onImported,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('export');

  return (
    <Modal
      title='匯入 / 匯出旅程'
      onClose={onClose}
      maxWidth='max-w-lg'
      scrollable
    >
      <div className='border-border mb-4 flex gap-1 border-b'>
        <button
          type='button'
          onClick={() => setActiveTab('export')}
          className={tabButtonClass(activeTab === 'export')}
        >
          匯出旅程
        </button>
        <button
          type='button'
          onClick={() => setActiveTab('import')}
          className={tabButtonClass(activeTab === 'import')}
        >
          匯入旅程
        </button>
        <button
          type='button'
          onClick={() => setActiveTab('auto')}
          className={tabButtonClass(activeTab === 'auto')}
        >
          自動備份
        </button>
      </div>

      {activeTab === 'export' && <ExportTab trips={trips} onClose={onClose} />}
      {activeTab === 'import' && (
        <ImportTab onClose={onClose} onImported={onImported} />
      )}
      {activeTab === 'auto' && <AutoBackupsTab />}
    </Modal>
  );
}
