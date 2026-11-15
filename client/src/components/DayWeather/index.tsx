import { ChevronLeft, ChevronRight, Droplets, Umbrella } from 'lucide-react';
import { useEffect, useState } from 'react';

import { usePointerSwipe } from '@/hooks/usePointerSwipe';
import type { DayLocation } from '@/types';
import {
  fetchDailyWeather,
  type WeatherSource,
  type WeatherState,
} from '@/utils/weatherApi';

import WeatherIcon from './WeatherIcon';

interface Props {
  locations: DayLocation[];
  date: string;
}

const SOURCE_LABELS: Record<WeatherSource, string> = {
  openweathermap: 'OpenWeatherMap',
  visualcrossing: 'Visual Crossing',
};

/**
 * Weather forecast card for one trip day. With several day locations it shows
 * prev/next controls and supports swiping between them.
 *
 * @param props.locations - The day's locations; renders nothing when empty.
 * @param props.date - Day date (YYYY-MM-DD) to fetch the forecast for.
 */
export default function DayWeather({ locations, date }: Props) {
  const [idx, setIdx] = useState(0);
  const [current, setCurrent] = useState<WeatherState | null>(null);

  const lastIdx = Math.max(locations.length - 1, 0);
  // Clamp during render (not in an effect) so a shrunken locations list never
  // leaves the stored index pointing past the end, e.g. after it grows again.
  if (idx > lastIdx) {
    setIdx(lastIdx);
  }
  const currentIdx = Math.min(idx, lastIdx);

  const location = locations[currentIdx];
  const locationId = location?.id;
  const locationName = location?.name;

  useEffect(() => {
    if (!locationId || !locationName) {
      return;
    }

    // A slower response for a previous location/date must not overwrite the
    // current one, so results are dropped once this effect is cleaned up.
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show the loading state immediately when the location or date changes
    setCurrent({ status: 'loading' });
    fetchDailyWeather(locationName, date)
      .then(result => {
        if (active) {
          setCurrent(result);
        }
      })
      .catch(() => {
        if (active) {
          setCurrent({ status: 'error' });
        }
      });
    return () => {
      active = false;
    };
  }, [locationId, locationName, date]);

  const canPrev = currentIdx > 0;
  const canNext = currentIdx < lastIdx;
  const goPrev = () => setIdx(Math.max(currentIdx - 1, 0));
  const goNext = () => setIdx(Math.min(currentIdx + 1, lastIdx));

  const swipeHandlers = usePointerSwipe({
    enabled: locations.length > 1,
    onSwipeLeft: () => {
      if (canNext) {
        goNext();
      }
    },
    onSwipeRight: () => {
      if (canPrev) {
        goPrev();
      }
    },
  });

  if (!location) {
    return null;
  }

  return (
    <div
      className={[
        'mt-2.5 flex min-h-[140px] flex-col rounded-xl bg-blue-50 px-3 py-2.5 select-none dark:bg-blue-950/20',
        locations.length > 1 ? 'cursor-grab active:cursor-grabbing' : '',
      ].join(' ')}
      style={{ touchAction: locations.length > 1 ? 'pan-y' : undefined }}
      {...swipeHandlers}
    >
      {locations.length > 1 && (
        <div className='mb-1.5 flex items-center justify-center gap-1'>
          <button
            onClick={goPrev}
            disabled={!canPrev}
            className='text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30'
            aria-label='上一個地區'
          >
            <ChevronLeft size={13} />
          </button>
          <span className='max-w-30 truncate text-xs text-muted-foreground'>
            {location.name}
          </span>
          <button
            onClick={goNext}
            disabled={!canNext}
            className='text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30'
            aria-label='下一個地區'
          >
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      <div className='flex flex-1 flex-col items-center justify-center'>
        {current?.status === 'loading' && (
          <p className='animate-pulse text-center text-xs text-muted-foreground'>
            查詢中…
          </p>
        )}

        {current?.status === 'not_found' && (
          <p className='text-center text-xs text-muted-foreground'>
            找不到「{location.name}」的天氣資料
          </p>
        )}

        {current?.status === 'out_of_range' && (
          <p className='text-center text-xs text-muted-foreground'>
            超出預報範圍（僅支援今日起 5 天內）
          </p>
        )}

        {current?.status === 'error' && (
          <p className='text-center text-xs text-muted-foreground'>
            天氣資料取得失敗
          </p>
        )}

        {current?.status === 'success' && (
          <div
            className='flex flex-col items-center gap-1'
            title={`資料來源：${SOURCE_LABELS[current.source]}`}
          >
            <WeatherIcon code={current.data.icon} />
            <div className='text-center'>
              <p className='text-xs font-medium text-foreground capitalize'>
                {current.data.description}
              </p>
              <p className='text-xs text-foreground/80'>
                {current.data.tempMin}° / {current.data.tempMax}°C
              </p>
              <div className='mt-0.5 flex items-center justify-center gap-2 text-xs text-muted-foreground'>
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
