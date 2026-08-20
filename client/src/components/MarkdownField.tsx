import { useState } from 'react';

import { INPUT_CLS } from './formStyles';
import MarkdownContent from './MarkdownContent';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  /** Tailwind min-height class applied to the preview panel. */
  previewMinHeight?: string;
}

/**
 * Labeled textarea with an edit/preview toggle for Markdown content, sharing
 * the tab UI and rendering used across the attraction and travel-connection
 * forms.
 */
export default function MarkdownField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  previewMinHeight = 'min-h-24',
}: Props) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');

  return (
    <div>
      <div className='mb-1.5 flex items-center justify-between'>
        <label className='text-foreground text-sm font-medium'>{label}</label>
        <div className='border-border flex overflow-hidden rounded-md border text-xs'>
          <button
            type='button'
            tabIndex={-1}
            onClick={() => setTab('edit')}
            className={`px-2.5 py-0.5 transition-colors ${
              tab === 'edit'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            編輯
          </button>
          <button
            type='button'
            tabIndex={-1}
            onClick={() => setTab('preview')}
            className={`px-2.5 py-0.5 transition-colors ${
              tab === 'preview'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            預覽
          </button>
        </div>
      </div>
      {tab === 'edit' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`${INPUT_CLS} resize-none font-mono text-sm`}
        />
      ) : (
        <div
          className={`border-border bg-background text-foreground ${previewMinHeight} rounded-lg border px-3 py-2 text-sm`}
        >
          {value.trim() ? (
            <MarkdownContent>{value}</MarkdownContent>
          ) : (
            <span className='text-muted-foreground text-xs'>尚無內容</span>
          )}
        </div>
      )}
    </div>
  );
}
