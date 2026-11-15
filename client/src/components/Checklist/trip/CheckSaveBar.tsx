import { Check, X } from 'lucide-react';

interface Props {
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export default function CheckSaveBar({ saving, onSave, onDiscard }: Props) {
  return (
    <div className='fixed right-6 bottom-6 z-40 flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 shadow-xl'>
      <span className='text-sm text-muted-foreground'>有未儲存的變更</span>
      <button
        onClick={onDiscard}
        disabled={saving}
        className='flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50'
      >
        <X size={14} />
        放棄
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className='flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50'
      >
        <Check size={14} />
        {saving ? '儲存中…' : '儲存'}
      </button>
    </div>
  );
}
