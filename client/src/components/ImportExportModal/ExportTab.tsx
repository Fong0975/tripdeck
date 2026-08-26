import { useState } from 'react';

import { exportTripsBackup } from '@/api/backup';
import type { Trip } from '@/types';
import { downloadBlob } from '@/utils/download';

import ModalFooterActions from '../ui/ModalFooterActions';
import StatusMessage from '../ui/StatusMessage';

interface Props {
  trips: Trip[];
  onClose: () => void;
}

/** Builds a local timestamped filename, e.g. "tripdeck-backup-20260826-153000.zip". */
function buildExportFilename(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `tripdeck-backup-${stamp}.zip`;
}

export default function ExportTab({ trips, onClose }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [includeTemplate, setIncludeTemplate] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState(false);

  const allSelected = trips.length > 0 && selectedIds.size === trips.length;
  const canSubmit = selectedIds.size > 0 || includeTemplate;

  const toggleTemplate = () => {
    setIncludeTemplate(prev => !prev);
    setExportError('');
    setExportSuccess(false);
  };

  const toggleTrip = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setExportError('');
    setExportSuccess(false);
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(trips.map(t => t.id)));
    setExportError('');
    setExportSuccess(false);
  };

  const handleExportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }

    setExporting(true);
    setExportError('');
    setExportSuccess(false);
    try {
      const blob = await exportTripsBackup([...selectedIds], includeTemplate);
      downloadBlob(blob, buildExportFilename(new Date()));
      setExportSuccess(true);
    } catch {
      setExportError('匯出失敗，請稍後再試');
    } finally {
      setExporting(false);
    }
  };

  return (
    <form onSubmit={handleExportSubmit} className='space-y-4'>
      <label className='border-border hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5'>
        <input
          type='checkbox'
          checked={includeTemplate}
          onChange={toggleTemplate}
          className='accent-primary size-3.5 cursor-pointer'
        />
        <div className='flex-1'>
          <p className='text-foreground text-sm'>打包清單範本</p>
          <p className='text-muted-foreground text-xs'>
            所有旅程共用的全域打包清單範本
          </p>
        </div>
      </label>

      {trips.length === 0 ? (
        <StatusMessage variant='info'>目前沒有旅程可以匯出。</StatusMessage>
      ) : (
        <>
          <div className='flex items-center justify-between'>
            <span className='text-foreground text-sm font-medium'>
              選擇要匯出的旅程
            </span>
            <button
              type='button'
              onClick={toggleAll}
              className='text-primary text-sm hover:underline'
            >
              {allSelected ? '取消全選' : '全選'}
            </button>
          </div>

          <div className='border-border max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2'>
            {trips.map(trip => (
              <label
                key={trip.id}
                className='hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5'
              >
                <input
                  type='checkbox'
                  checked={selectedIds.has(trip.id)}
                  onChange={() => toggleTrip(trip.id)}
                  className='accent-primary size-3.5 cursor-pointer'
                />
                <span className='text-foreground flex-1 truncate text-sm'>
                  {trip.title}
                </span>
                <span className='text-muted-foreground shrink-0 text-xs'>
                  {trip.startDate} ~ {trip.endDate}
                </span>
              </label>
            ))}
          </div>
        </>
      )}

      {exportError && (
        <StatusMessage variant='error'>{exportError}</StatusMessage>
      )}
      {exportSuccess && (
        <StatusMessage variant='success'>已成功下載備份檔案。</StatusMessage>
      )}

      <ModalFooterActions
        onCancel={onClose}
        submitLabel={exporting ? '匯出中…' : '匯出'}
        disabled={exporting || !canSubmit}
      />
    </form>
  );
}
