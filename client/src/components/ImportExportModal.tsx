import { FileUp } from 'lucide-react';
import { useRef, useState } from 'react';

import { exportTripsBackup, importTripsBackup } from '@/api/backup';
import { ApiError } from '@/api/client';
import type {
  ImportBackupErrorDetails,
  ImportBackupResult,
  Trip,
} from '@/types';
import { downloadBlob } from '@/utils/download';

import Modal from './ui/Modal';
import ModalFooterActions from './ui/ModalFooterActions';

interface Props {
  trips: Trip[];
  onClose: () => void;
  /** Called after at least one trip was successfully imported, so the caller can refresh its trip list. */
  onImported?: () => void;
}

type Tab = 'export' | 'import';

/** Builds a local timestamped filename, e.g. "tripdeck-backup-20260826-153000.zip". */
function buildExportFilename(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `tripdeck-backup-${stamp}.zip`;
}

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

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importErrorDetails, setImportErrorDetails] =
    useState<ImportBackupErrorDetails | null>(null);
  const [importResult, setImportResult] = useState<ImportBackupResult | null>(
    null,
  );
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const allSelected = trips.length > 0 && selectedIds.size === trips.length;

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
    if (selectedIds.size === 0) {
      return;
    }

    setExporting(true);
    setExportError('');
    setExportSuccess(false);
    try {
      const blob = await exportTripsBackup([...selectedIds]);
      downloadBlob(blob, buildExportFilename(new Date()));
      setExportSuccess(true);
    } catch {
      setExportError('匯出失敗，請稍後再試');
    } finally {
      setExporting(false);
    }
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportFile(e.target.files?.[0] ?? null);
    setImportError('');
    setImportErrorDetails(null);
    setImportResult(null);
  };

  const clearImportFile = () => {
    setImportFile(null);
    if (importFileInputRef.current) {
      importFileInputRef.current.value = '';
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      return;
    }

    setImporting(true);
    setImportError('');
    setImportErrorDetails(null);
    setImportResult(null);
    try {
      const result = await importTripsBackup(importFile);
      setImportResult(result);
      if (result.imported.length > 0) {
        onImported?.();
      }
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setImportErrorDetails(err.details as ImportBackupErrorDetails);
      }
      setImportError(
        err instanceof Error ? err.message : '匯入失敗，請稍後再試',
      );
    } finally {
      setImporting(false);
    }
  };

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
      </div>

      {activeTab === 'export' ? (
        <form onSubmit={handleExportSubmit} className='space-y-4'>
          {trips.length === 0 ? (
            <p className='text-muted-foreground text-sm'>
              目前沒有旅程可以匯出。
            </p>
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
            <p className='text-destructive text-sm'>{exportError}</p>
          )}
          {exportSuccess && (
            <p className='text-primary text-sm'>已成功下載備份檔案。</p>
          )}

          <ModalFooterActions
            onCancel={onClose}
            submitLabel={exporting ? '匯出中…' : '匯出'}
            disabled={exporting || selectedIds.size === 0}
          />
        </form>
      ) : (
        <form onSubmit={handleImportSubmit} className='space-y-4'>
          <p className='text-muted-foreground text-xs'>
            選擇備份檔案匯入，一律以新旅程方式建立；若旅程名稱重複，會自動加上流水號。
          </p>

          {importFile ? (
            <div className='border-border flex items-center justify-between gap-2 rounded-lg border border-dashed p-3'>
              <span className='text-foreground truncate text-sm'>
                {importFile.name}
              </span>
              <button
                type='button'
                onClick={clearImportFile}
                className='text-muted-foreground hover:text-destructive shrink-0 text-xs'
              >
                移除
              </button>
            </div>
          ) : (
            <button
              type='button'
              onClick={() => importFileInputRef.current?.click()}
              className='border-border text-muted-foreground hover:border-primary/50 hover:text-primary flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-sm transition-colors'
            >
              <FileUp size={16} />
              選擇備份檔案
            </button>
          )}
          <input
            ref={importFileInputRef}
            type='file'
            accept='.zip,application/zip'
            onChange={handleImportFileSelect}
            className='hidden'
          />

          {importError && (
            <div className='space-y-1'>
              <p className='text-destructive text-sm'>{importError}</p>
              {importErrorDetails && (
                <ul className='text-destructive list-disc space-y-0.5 pl-5 text-xs'>
                  {importErrorDetails.trips.map(t => (
                    <li key={t.folder}>
                      {`旅程「${t.title}」缺少 ${t.missingFilenames.length} 張圖片：${t.missingFilenames.join('、')}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {importResult && (
            <div className='space-y-2'>
              {importResult.imported.length > 0 && (
                <div>
                  <p className='text-foreground text-sm font-medium'>
                    匯入成功
                  </p>
                  <ul className='text-primary space-y-0.5 text-sm'>
                    {importResult.imported.map(t => (
                      <li key={t.newTripId}>{t.title}</li>
                    ))}
                  </ul>
                </div>
              )}
              {importResult.failed.length > 0 && (
                <div>
                  <p className='text-foreground text-sm font-medium'>
                    匯入失敗
                  </p>
                  <ul className='text-destructive space-y-0.5 text-sm'>
                    {importResult.failed.map(t => (
                      <li key={t.originalTripId}>
                        {t.title}：{t.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <ModalFooterActions
            onCancel={onClose}
            submitLabel={importing ? '匯入中…' : '匯入'}
            disabled={importing || !importFile}
          />
        </form>
      )}
    </Modal>
  );
}
