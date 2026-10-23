import { useState } from 'react';

import { exportTripsBackup } from '@/api/backup';
import { showToast } from '@/lib/toast';
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

  const allSelected = trips.length > 0 && selectedIds.size === trips.length;
  const canSubmit = selectedIds.size > 0 || includeTemplate;

  const toggleTemplate = () => {
    setIncludeTemplate(prev => !prev);
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
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(trips.map(t => t.id)));
  };

  const handleExportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }

    setExporting(true);
    try {
      const blob = await exportTripsBackup([...selectedIds], includeTemplate);
      downloadBlob(blob, buildExportFilename(new Date()));
      showToast('success', '已成功下載備份檔案。');
    } catch {
      showToast('error', '匯出失敗，請稍後再試');
    } finally {
      setExporting(false);
    }
  };

  return (
    <form onSubmit={handleExportSubmit} className='space-y-4'>
      <label className='flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2 py-1.5 hover:bg-accent'>
        <input
          type='checkbox'
          checked={includeTemplate}
          onChange={toggleTemplate}
          className='size-3.5 cursor-pointer accent-primary'
        />
        <div className='flex-1'>
          <p className='text-sm text-foreground'>打包清單範本</p>
          <p className='text-xs text-muted-foreground'>
            所有旅程共用的全域打包清單範本
          </p>
        </div>
      </label>

      {trips.length === 0 ? (
        <StatusMessage variant='info'>目前沒有旅程可以匯出。</StatusMessage>
      ) : (
        <>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium text-foreground'>
              選擇要匯出的旅程
            </span>
            <button
              type='button'
              onClick={toggleAll}
              className='text-sm text-primary hover:underline'
            >
              {allSelected ? '取消全選' : '全選'}
            </button>
          </div>

          <div className='max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-2'>
            {trips.map(trip => (
              <label
                key={trip.id}
                className='flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent'
              >
                <input
                  type='checkbox'
                  checked={selectedIds.has(trip.id)}
                  onChange={() => toggleTrip(trip.id)}
                  className='size-3.5 cursor-pointer accent-primary'
                />
                <span className='flex-1 truncate text-sm text-foreground'>
                  {trip.title}
                </span>
                <span className='shrink-0 text-xs text-muted-foreground'>
                  {trip.startDate} ~ {trip.endDate}
                </span>
              </label>
            ))}
          </div>
        </>
      )}

      <ModalFooterActions
        onCancel={onClose}
        submitLabel={exporting ? '匯出中…' : '匯出'}
        disabled={exporting || !canSubmit}
      />
    </form>
  );
}
