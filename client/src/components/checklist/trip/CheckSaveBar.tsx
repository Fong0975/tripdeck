import { Check, X } from 'lucide-react';

interface Props {
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export default function CheckSaveBar({ saving, onSave, onDiscard }: Props) {
  return (
    <div className='border-border bg-card fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-2xl border px-5 py-3 shadow-xl'>
      <span className='text-muted-foreground text-sm'>有未儲存的變更</span>
      <button
        onClick={onDiscard}
        disabled={saving}
        className='text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-50'
      >
        <X size={14} />
        放棄
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className='bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50'
      >
        <Check size={14} />
        {saving ? '儲存中…' : '儲存'}
      </button>
    </div>
  );
}
