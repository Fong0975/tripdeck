import { FileUp } from 'lucide-react';
import { useRef, useState } from 'react';

import { importTripsBackup } from '@/api/backup';
import { ApiError } from '@/api/client';
import type { ImportBackupErrorDetails, ImportBackupResult } from '@/types';

import ModalFooterActions from '../ui/ModalFooterActions';
import StatusMessage from '../ui/StatusMessage';

interface Props {
  onClose: () => void;
  /** Called after at least one trip was successfully imported, so the caller can refresh its trip list. */
  onImported?: () => void;
}

export default function ImportTab({ onClose, onImported }: Props) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [restoreTemplate, setRestoreTemplate] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importErrorDetails, setImportErrorDetails] =
    useState<ImportBackupErrorDetails | null>(null);
  const [importResult, setImportResult] = useState<ImportBackupResult | null>(
    null,
  );
  const importFileInputRef = useRef<HTMLInputElement>(null);

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
      const result = await importTripsBackup(importFile, restoreTemplate);
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

      <label className='flex cursor-pointer items-start gap-2'>
        <input
          type='checkbox'
          checked={restoreTemplate}
          onChange={e => setRestoreTemplate(e.target.checked)}
          className='accent-primary mt-0.5 size-3.5 cursor-pointer'
        />
        <span className='text-foreground text-sm'>
          同時還原打包清單範本
          <span className='text-muted-foreground block text-xs'>
            若備份檔案包含範本快照，將覆蓋目前的範本內容；一般旅程匯出不含範本，此選項無效果。
          </span>
        </span>
      </label>

      {importError && (
        <div className='space-y-1'>
          <StatusMessage variant='error'>{importError}</StatusMessage>
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
            <div className='space-y-1'>
              <StatusMessage variant='success'>匯入成功</StatusMessage>
              <ul className='text-primary space-y-0.5 pl-[34px] text-sm'>
                {importResult.imported.map(t => (
                  <li key={t.newTripId}>{t.title}</li>
                ))}
              </ul>
            </div>
          )}
          {importResult.failed.length > 0 && (
            <div className='space-y-1'>
              <StatusMessage variant='error'>匯入失敗</StatusMessage>
              <ul className='text-destructive space-y-0.5 pl-[34px] text-sm'>
                {importResult.failed.map(t => (
                  <li key={t.originalTripId}>
                    {t.title}：{t.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {importResult.templateRestored && (
            <StatusMessage variant='success'>
              已還原打包清單範本。
            </StatusMessage>
          )}
          {importResult.imported.length === 0 &&
            importResult.failed.length === 0 &&
            !importResult.templateRestored && (
              <StatusMessage variant='info'>
                這份備份沒有任何旅程可以匯入；若備份包含打包清單範本，需勾選「同時還原打包清單範本」才會套用。
              </StatusMessage>
            )}
        </div>
      )}

      <ModalFooterActions
        onCancel={onClose}
        submitLabel={importing ? '匯入中…' : '匯入'}
        disabled={importing || !importFile}
      />
    </form>
  );
}
