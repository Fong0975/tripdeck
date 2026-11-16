import type { ViewMode } from './viewMode';

const OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'category', label: '依分類' },
  { value: 'storage', label: '依存放位置' },
];

interface Props {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/** Segmented control that switches how the checklist is grouped. */
export default function ViewModeToggle({ value, onChange }: Props) {
  return (
    <div
      role='group'
      aria-label='檢視方式'
      className='inline-flex rounded-lg bg-muted p-0.5'
    >
      {OPTIONS.map(option => (
        <button
          key={option.value}
          type='button'
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-3 py-1 text-sm transition-colors ${
            value === option.value
              ? 'bg-background font-medium text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
