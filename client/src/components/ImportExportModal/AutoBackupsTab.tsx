import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { getAutoBackupDownloadUrl, listAutoBackups } from '@/api/backup';
import { showToast } from '@/lib/toast';
import type { AutoBackupFileInfo } from '@/types';

import LoadingIndicator from '../ui/LoadingIndicator';
import StatusMessage from '../ui/StatusMessage';

/** Formats a byte count as a short human-readable size, e.g. "1.2 MB". */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export default function AutoBackupsTab() {
  const [autoBackups, setAutoBackups] = useState<AutoBackupFileInfo[]>([]);
  const [autoBackupsLoading, setAutoBackupsLoading] = useState(false);
  const [autoBackupsError, setAutoBackupsError] = useState('');

  const loadAutoBackups = useCallback(async () => {
    setAutoBackupsLoading(true);
    setAutoBackupsError('');
    try {
      setAutoBackups(await listAutoBackups());
    } catch {
      setAutoBackupsError('讀取自動備份清單失敗，請稍後再試');
      showToast('error', '讀取自動備份清單失敗，請稍後再試');
    } finally {
      setAutoBackupsLoading(false);
    }
  }, []);

  // Runs once when this tab is switched to (the tab body is unmounted while
  // another tab is active, so mounting itself is the "tab opened" signal).
  useEffect(() => {
    void loadAutoBackups();
  }, [loadAutoBackups]);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-muted-foreground text-xs'>
          系統每隔一段時間自動建立的完整備份（所有旅程、打包清單範本與圖片），只保留最新幾份。下載後可至「匯入旅程」分頁上傳還原。
        </p>
        <button
          type='button'
          onClick={() => void loadAutoBackups()}
          disabled={autoBackupsLoading}
          className='text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1 pl-2 text-xs disabled:opacity-50'
        >
          <RefreshCw size={12} />
          重新整理
        </button>
      </div>

      {!autoBackupsError && autoBackupsLoading && <LoadingIndicator />}

      {!autoBackupsError && !autoBackupsLoading && autoBackups.length === 0 && (
        <StatusMessage variant='info'>目前還沒有任何自動備份。</StatusMessage>
      )}

      {!autoBackupsError && autoBackups.length > 0 && (
        <div className='border-border max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2'>
          {autoBackups.map(file => (
            <div
              key={file.filename}
              className='flex items-center justify-between gap-2 rounded-md px-2 py-1.5'
            >
              <div className='min-w-0 flex-1'>
                <p className='text-foreground truncate text-sm'>
                  {new Date(file.createdAt).toLocaleString()}
                </p>
                <p className='text-muted-foreground text-xs'>
                  {formatFileSize(file.sizeBytes)}
                </p>
              </div>
              <a
                href={getAutoBackupDownloadUrl(file.filename)}
                download={file.filename}
                className='text-primary shrink-0 text-sm hover:underline'
              >
                下載
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
