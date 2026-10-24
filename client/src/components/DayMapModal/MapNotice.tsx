interface Props {
  resolving: boolean;
  failed: boolean;
  geocodeExhausted: boolean;
  /** Attractions of the selected day that have no location on the map. */
  unlocatedCount: number;
  /** Whether other days' dots are currently drawn on the map. */
  showOtherDays: boolean;
  onToggleOtherDays: () => void;
}

/**
 * Overlay in the map's corner: a status line explaining what the map can't
 * show (yet), if anything, plus the legend for the two pin styles. The
 * other-days entry is a toggle that shows or hides those dots.
 */
export default function MapNotice({
  resolving,
  failed,
  geocodeExhausted,
  unlocatedCount,
  showOtherDays,
  onToggleOtherDays,
}: Props) {
  let message: string | null = null;
  if (resolving) {
    message = '正在定位景點…';
  } else if (failed) {
    message = '無法取得景點座標，僅顯示已知的位置';
  } else if (unlocatedCount > 0) {
    message = `有 ${unlocatedCount} 個景點無法在地圖上定位${
      geocodeExhausted ? '（今日地點查詢額度已用完）' : ''
    }`;
  }

  return (
    <div className='pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1.5 text-xs'>
      {message && (
        <p
          role='status'
          className='rounded-lg bg-card/90 px-2.5 py-1.5 text-foreground shadow'
        >
          {message}
        </p>
      )}
      <p className='flex items-center gap-3 rounded-lg bg-card/90 px-2.5 py-1.5 text-muted-foreground shadow'>
        <span className='flex items-center gap-1'>
          <span className='size-2.5 rounded-full bg-primary' />
          當天景點
        </span>
        <button
          type='button'
          aria-pressed={showOtherDays}
          onClick={onToggleOtherDays}
          className='pointer-events-auto flex cursor-pointer items-center gap-1 rounded px-1 transition-colors hover:bg-accent hover:text-foreground'
        >
          {showOtherDays && (
            <span
              data-testid='other-days-dot'
              className='size-3.5 rounded-full border-2 border-white bg-gray-600 shadow-md'
            />
          )}
          其他天
        </button>
      </p>
    </div>
  );
}
