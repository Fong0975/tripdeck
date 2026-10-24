import { useEffect, useRef, useState } from 'react';

import { MapsQuotaError } from '@/api/maps';
import { subscribeMapsAuthFailure } from '@/utils/googleMaps/loader';
import type { MapPoint } from '@/utils/googleMaps/mapPoints';
import {
  attachMapSession,
  detachMapSession,
  type MapSession,
} from '@/utils/googleMaps/mapSession';
import { applyMarkers } from '@/utils/googleMaps/markers';
import { applyRoute } from '@/utils/googleMaps/route';

interface Props {
  points: MapPoint[];
  /** Day whose attractions are drawn as normal-size coloured pins. */
  activeDayId: number;
}

type CanvasState =
  | { status: 'loading' }
  | { status: 'ready'; session: MapSession }
  | { status: 'error'; message: string };

const QUOTA_MESSAGE = '今日地圖額度已用完，請明天再試';
const AUTH_FAILURE_MESSAGE = '地圖金鑰無效或額度已用完，暫時無法顯示地圖';
const LOAD_FAILURE_MESSAGE = '地圖載入失敗，請稍後再試';

/**
 * Hosts the shared Google map and keeps its markers in sync with `points`.
 * Shows a status overlay while the map loads or when it cannot be shown,
 * including when Google rejects the key after loading.
 */
export default function DayMapCanvas({ points, activeDayId }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<CanvasState>({ status: 'loading' });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    let active = true;
    attachMapSession(host)
      .then(session => {
        if (active) {
          setState({ status: 'ready', session });
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message:
              err instanceof MapsQuotaError
                ? QUOTA_MESSAGE
                : LOAD_FAILURE_MESSAGE,
          });
        }
      });
    const unsubscribe = subscribeMapsAuthFailure(() => {
      if (active) {
        setState({ status: 'error', message: AUTH_FAILURE_MESSAGE });
      }
    });
    return () => {
      active = false;
      unsubscribe();
      detachMapSession();
    };
  }, []);

  useEffect(() => {
    if (state.status === 'ready') {
      applyMarkers(state.session, points, activeDayId);
      applyRoute(state.session, points, activeDayId);
    }
  }, [state, points, activeDayId]);

  return (
    <div className='relative size-full'>
      <div ref={hostRef} className='size-full' />
      {state.status !== 'ready' && (
        <div
          role={state.status === 'error' ? 'alert' : 'status'}
          className='absolute inset-0 flex items-center justify-center bg-muted/80 p-4 text-center text-sm text-muted-foreground'
        >
          {state.status === 'loading' ? '地圖載入中…' : state.message}
        </div>
      )}
    </div>
  );
}
