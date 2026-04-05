import { Download, Loader2, X } from 'lucide-react';
import { useState } from 'react';

import type { Trip, TripContent } from '@/types';
import { exportToDocx } from '@/utils/exportToDocx';
import { generateMarkdown } from '@/utils/generateMarkdown';

interface Props {
  trip: Trip;
  content: TripContent;
  onClose: () => void;
}

export default function ExportModal({ trip, content, onClose }: Props) {
  const [markdown, setMarkdown] = useState(() =>
    generateMarkdown(trip, content),
  );
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      await exportToDocx(markdown, trip.title);
    } catch (e) {
      setError(e instanceof Error ? e.message : '匯出失敗，請稍後再試');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-black/50 backdrop-blur-sm'
        onClick={onClose}
      />

      <div className='border-border bg-card relative flex h-[92vh] w-full max-w-4xl flex-col rounded-2xl border shadow-2xl'>
        {/* Header */}
        <div className='border-border flex items-center justify-between border-b px-6 py-4'>
          <div>
            <h2 className='text-foreground text-xl font-bold'>匯出行程</h2>
            <p className='text-muted-foreground mt-0.5 text-xs'>
              可在下方修改 Markdown 內容後，點擊「匯出 Word」下載 .docx 檔案
            </p>
          </div>
          <button
            onClick={onClose}
            className='text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-1.5 transition-colors'
            aria-label='關閉'
          >
            <X size={20} />
          </button>
        </div>

        {/* Editor */}
        <div className='min-h-0 flex-1 p-4'>
          <textarea
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
            spellCheck={false}
            className='border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary/50 size-full resize-none rounded-xl border px-4 py-3 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2'
          />
        </div>

        {/* Footer */}
        <div className='border-border border-t px-6 py-4'>
          {error && <p className='text-destructive mb-3 text-sm'>{error}</p>}
          <div className='flex justify-end gap-3'>
            <button
              onClick={onClose}
              disabled={exporting}
              className='border-border text-foreground hover:bg-accent rounded-xl border px-5 py-2 text-sm transition-colors disabled:opacity-50'
            >
              取消
            </button>
            <button
              onClick={() => void handleExport()}
              disabled={exporting}
              className='bg-primary text-primary-foreground flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition-all hover:opacity-90 active:scale-95 disabled:opacity-50'
            >
              {exporting ? (
                <>
                  <Loader2 size={16} className='animate-spin' />
                  匯出中…
                </>
              ) : (
                <>
                  <Download size={16} />
                  匯出 Word (.docx)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
