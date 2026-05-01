import { ChevronLeft, ChevronRight, Droplets, Umbrella } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { DayLocation } from '@/types';
import { fetchDailyWeather, type WeatherResult } from '@/utils/weatherApi';

interface Props {
  locations: DayLocation[];
  date: string;
}

export default function DayWeather({ locations, date }: Props) {
  const [idx, setIdx] = useState(0);
  const [current, setCurrent] = useState<WeatherResult | null>(null);
  const pointerStartX = useRef<number | null>(null);

  const location = locations[Math.min(idx, locations.length - 1)];
  const locationId = location?.id;
  const locationName = location?.name;

  useEffect(() => {
    if (!locationId || !locationName) {
      return;
    }

    setCurrent({ status: 'loading' });
    fetchDailyWeather(locationName, date)
      .then(result => setCurrent(result))
      .catch(() => setCurrent({ status: 'error' }));
  }, [locationId, locationName, date]);

  const canPrev = idx > 0;
  const canNext = idx < locations.length - 1;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (locations.length <= 1) {
      return;
    }
    pointerStartX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartX.current === null) {
      return;
    }
    const delta = e.clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (delta < -50 && canNext) {
      setIdx(i => i + 1);
    } else if (delta > 50 && canPrev) {
      setIdx(i => i - 1);
    }
  };

  if (!location) {
    return null;
  }

  return (
    <div
      className={[
        'mt-2.5 flex min-h-[140px] select-none flex-col rounded-xl bg-blue-50 px-3 py-2.5 dark:bg-blue-950/20',
        locations.length > 1 ? 'cursor-grab active:cursor-grabbing' : '',
      ].join(' ')}
      style={{ touchAction: locations.length > 1 ? 'pan-y' : undefined }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerStartX.current = null;
      }}
    >
      {locations.length > 1 && (
        <div className='mb-1.5 flex items-center justify-center gap-1'>
          <button
            onClick={() => setIdx(i => i - 1)}
            disabled={!canPrev}
            className='text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30'
            aria-label='上一個地區'
          >
            <ChevronLeft size={13} />
          </button>
          <span className='text-muted-foreground max-w-[120px] truncate text-xs'>
            {location.name}
          </span>
          <button
            onClick={() => setIdx(i => i + 1)}
            disabled={!canNext}
            className='text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30'
            aria-label='下一個地區'
          >
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      <div className='flex flex-1 flex-col items-center justify-center'>
        {current?.status === 'loading' && (
          <p className='text-muted-foreground animate-pulse text-center text-xs'>
            查詢中…
          </p>
        )}

        {current?.status === 'not_found' && (
          <p className='text-muted-foreground text-center text-xs'>
            找不到「{location.name}」的天氣資料
          </p>
        )}

        {current?.status === 'out_of_range' && (
          <p className='text-muted-foreground text-center text-xs'>
            超出預報範圍（僅支援今日起 5 天內）
          </p>
        )}

        {current?.status === 'error' && (
          <p className='text-muted-foreground text-center text-xs'>
            天氣資料取得失敗
          </p>
        )}

        {current?.status === 'success' && (
          <div className='flex flex-col items-center gap-1'>
            <img
              src={`https://openweathermap.org/img/wn/${current.data.icon}@2x.png`}
              alt={current.data.description}
              className='size-10'
            />
            <div className='text-center'>
              <p className='text-foreground text-xs font-medium capitalize'>
                {current.data.description}
              </p>
              <p className='text-foreground/80 text-xs'>
                {current.data.tempMin}° / {current.data.tempMax}°C
              </p>
              <div className='text-muted-foreground mt-0.5 flex items-center justify-center gap-2 text-xs'>
                <span className='flex items-center gap-0.5'>
                  <Droplets size={10} />
                  {current.data.humidity}%
                </span>
                {current.data.pop > 0 && (
                  <span className='flex items-center gap-0.5'>
                    <Umbrella size={10} />
                    {current.data.pop}%
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
