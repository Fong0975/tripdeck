import { useState } from 'react';

import { showToast } from '@/lib/toast';
import type { Trip, TripContent } from '@/types';

/**
 * Word (.docx) export of the loaded trip. The exporter is imported lazily so
 * its heavy dependencies stay out of the page bundle, and repeated triggers
 * are ignored while an export is already running.
 *
 * @param trip - The loaded trip, or null while loading.
 * @param content - The loaded trip content, or null while loading.
 * @returns `exporting` (true while an export runs) and `handleExport`.
 */
export function useTripExport(trip: Trip | null, content: TripContent | null) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!trip || !content || exporting) {
      return;
    }
    setExporting(true);
    try {
      const { exportToDocx } = await import('@/utils/exportToDocx');
      await exportToDocx(trip, content);
      showToast('success', '已匯出 Word 文件。');
    } catch {
      showToast('error', '匯出 Word 文件失敗，請稍後再試');
    } finally {
      setExporting(false);
    }
  };

  return { exporting, handleExport };
}
