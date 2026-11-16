import type { DayMapExportOptions } from '@/utils/exportToDocx/exportOptions';

import ExportOptionSection from './ExportOptionSection';

interface Props {
  value: DayMapExportOptions;
  onChange: (value: DayMapExportOptions) => void;
}

/** Settings for the per-day attraction map picture: whether to include it. */
export default function DayMapOptionsSection({ value, onChange }: Props) {
  return (
    <ExportOptionSection
      title='每日景點地圖'
      description='在每天的日期標題之後加入當天景點的標記、時間與連線圖片（僅包含已有座標的景點）。'
    >
      <label className='flex cursor-pointer items-center gap-2'>
        <input
          type='checkbox'
          checked={value.enabled}
          onChange={e => onChange({ ...value, enabled: e.target.checked })}
          className='size-3.5 cursor-pointer accent-primary'
        />
        <span className='text-sm text-foreground'>包含每日景點地圖圖片</span>
      </label>
    </ExportOptionSection>
  );
}
