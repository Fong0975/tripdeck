interface Props {
  resolving: boolean;
  failed: boolean;
  geocodeExhausted: boolean;
  /** Attractions of the selected day that have no location on the map. */
  unlocatedCount: number;
}

/**
 * Overlay in the map's corner: a status line explaining what the map can't
 * show (yet), if anything, plus the legend for the two pin styles.
 */
export default function MapNotice({
  resolving,
  failed,
  geocodeExhausted,
  unlocatedCount,
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
        <span className='flex items-center gap-1'>
          <span className='size-2 rounded-full bg-gray-400' />
          其他天
        </span>
      </p>
    </div>
  );
}
