import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from 'lucide-react';

import type { WeatherIconCode } from '@/utils/weatherApi';

/**
 * Renders the lucide icon matching a normalized weather condition, tinted to
 * suggest the weather (yellow sun, blue rain, …). Unknown codes fall back to a
 * neutral cloud.
 *
 * @param props.code - Normalized weather condition from the weather API.
 * @param props.size - Icon size in pixels; defaults to 36.
 */
export default function WeatherIcon({
  code,
  size = 36,
}: {
  code: WeatherIconCode;
  size?: number;
}) {
  if (code === 'clear') {
    return <Sun size={size} className='text-yellow-400' />;
  }
  if (code === 'partly-cloudy') {
    return <CloudSun size={size} className='text-yellow-400' />;
  }
  if (code === 'cloudy') {
    return <Cloud size={size} className='text-slate-400' />;
  }
  if (code === 'fog') {
    return <CloudFog size={size} className='text-slate-400' />;
  }
  if (code === 'drizzle') {
    return <CloudDrizzle size={size} className='text-blue-400' />;
  }
  if (code === 'rain') {
    return <CloudRain size={size} className='text-blue-500' />;
  }
  if (code === 'snow') {
    return <CloudSnow size={size} className='text-sky-300' />;
  }
  if (code === 'thunder') {
    return <CloudLightning size={size} className='text-violet-400' />;
  }
  return <Cloud size={size} className='text-slate-400' />;
}
