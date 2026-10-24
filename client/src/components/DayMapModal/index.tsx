import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useTripGeo } from '@/hooks/useTripGeo';
import type { DayPlan } from '@/types';
import { buildMapPoints, hasCoordinates } from '@/utils/googleMaps/mapPoints';

import DayMapCanvas from './DayMapCanvas';
import { dayTabId } from './dayTabId';
import DayTabs from './DayTabs';
import MapNotice from './MapNotice';

interface Props {
  tripId: number;
  days: DayPlan[];
  initialDayIndex: number;
  onClose: () => void;
}

const PANEL_ID = 'day-map-panel';

/**
 * Near-full-screen modal with one tab per trip day. Opens on the day whose
 * map button was clicked; the area below the tabs is the map for the selected
 * day. Closes on Escape, backdrop click and the close button.
 */
export default function DayMapModal({
  tripId,
  days,
  initialDayIndex,
  onClose,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(initialDayIndex);
  const geo = useTripGeo(tripId, days, days[activeIndex]?.id);
  const points = useMemo(() => buildMapPoints(geo.days), [geo.days]);

  useEffect(() => {
    const handle = (e: WindowEventMap['keydown']) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  const activeDay = days[activeIndex];
  if (!activeDay) {
    return null;
  }
  const unlocatedCount = geo.days[activeIndex].attractions.filter(
    attraction => !hasCoordinates(attraction),
  ).length;

  return createPortal(
    <div className='fixed inset-0 z-50 p-3 sm:p-6'>
      <div
        data-testid='day-map-backdrop'
        className='absolute inset-0 bg-black/50 backdrop-blur-xs'
        onClick={onClose}
      />

      <div
        role='dialog'
        aria-modal='true'
        aria-label='行程地圖'
        className='relative flex size-full animate-slide-up flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl'
      >
        <div className='flex items-center justify-between px-5 pt-4'>
          <h2 className='text-xl font-bold text-foreground'>行程地圖</h2>
          <button
            type='button'
            onClick={onClose}
            aria-label='關閉地圖'
            className='rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            <X size={20} />
          </button>
        </div>

        <DayTabs
          days={days}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
          panelId={PANEL_ID}
        />

        <div
          id={PANEL_ID}
          role='tabpanel'
          aria-labelledby={dayTabId(activeDay)}
          className='relative min-h-0 flex-1 bg-muted/30'
        >
          <DayMapCanvas points={points} activeDayId={activeDay.id} />
          <MapNotice
            resolving={geo.resolving}
            failed={geo.failed}
            geocodeExhausted={geo.geocodeExhausted}
            unlocatedCount={unlocatedCount}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
