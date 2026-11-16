import { useId } from 'react';

import { INPUT_CLS, LABEL_CLS } from '@/components/ui/formStyles';
import {
  DAYS_PER_IMAGE_CHOICES,
  type DaysPerImage,
  type TimelineExportOptions,
} from '@/utils/exportToDocx/exportOptions';

import ExportOptionSection from './ExportOptionSection';

interface Props {
  value: TimelineExportOptions;
  onChange: (value: TimelineExportOptions) => void;
}

function choiceLabel(choice: DaysPerImage): string {
  return choice === 'all' ? '全部' : `${choice} 天`;
}

/** Settings for the timeline picture: whether to include it and its grouping. */
export default function TimelineOptionsSection({ value, onChange }: Props) {
  const selectId = useId();

  const handleDaysChange = (raw: string) => {
    const choice = DAYS_PER_IMAGE_CHOICES.find(c => String(c) === raw);
    if (choice !== undefined) {
      onChange({ ...value, daysPerImage: choice });
    }
  };

  return (
    <ExportOptionSection
      title='時間軸'
      description='在行程資訊與第一天之間加入時間軸圖片。'
    >
      <label className='flex cursor-pointer items-center gap-2'>
        <input
          type='checkbox'
          checked={value.enabled}
          onChange={e => onChange({ ...value, enabled: e.target.checked })}
          className='size-3.5 cursor-pointer accent-primary'
        />
        <span className='text-sm text-foreground'>包含時間軸圖片</span>
      </label>

      <div>
        <label htmlFor={selectId} className={LABEL_CLS}>
          每張圖片包含的天數
        </label>
        <select
          id={selectId}
          value={String(value.daysPerImage)}
          disabled={!value.enabled}
          onChange={e => handleDaysChange(e.target.value)}
          className={`${INPUT_CLS} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {DAYS_PER_IMAGE_CHOICES.map(choice => (
            <option key={choice} value={String(choice)}>
              {choiceLabel(choice)}
            </option>
          ))}
        </select>
      </div>
    </ExportOptionSection>
  );
}
