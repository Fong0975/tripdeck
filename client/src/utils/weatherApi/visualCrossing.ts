import type { WeatherIconCode, WeatherResult } from './types';

export const VC_KEY = import.meta.env.VITE_VC_API_KEY as string | undefined;
const VC_BASE =
  'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';

function normalizeVcIcon(vcCode: string): WeatherIconCode {
  if (vcCode.startsWith('clear')) {
    return 'clear';
  }
  if (vcCode.startsWith('partly-cloudy')) {
    return 'partly-cloudy';
  }
  if (vcCode === 'cloudy' || vcCode === 'wind') {
    return 'cloudy';
  }
  if (vcCode === 'fog') {
    return 'fog';
  }
  if (
    vcCode.startsWith('snow') ||
    vcCode.startsWith('sleet') ||
    vcCode === 'hail'
  ) {
    return 'snow';
  }
  if (vcCode.startsWith('thunder')) {
    return 'thunder';
  }
  if (vcCode === 'rain' || vcCode.startsWith('showers')) {
    return 'rain';
  }
  return 'cloudy';
}

export async function fetchVcWeather(
  location: string,
  resolvedName: string,
  dateStr: string,
): Promise<WeatherResult> {
  const url = `${VC_BASE}/${encodeURIComponent(location)}/${dateStr}?key=${VC_KEY}&unitGroup=metric&lang=zh&include=days&elements=datetime,tempmin,tempmax,humidity,precipprob,icon,description,resolvedAddress`;

  const res = await fetch(url);
  if (res.status === 400 || res.status === 404) {
    return { status: 'not_found' };
  }
  if (!res.ok) {
    return { status: 'error' };
  }

  interface VcDay {
    tempmin: number;
    tempmax: number;
    humidity: number;
    precipprob: number;
    icon: string;
    description: string;
  }
  interface VcResponse {
    resolvedAddress: string;
    days: VcDay[];
  }

  const json = (await res.json()) as VcResponse;
  const day = json.days?.[0];
  if (!day) {
    return { status: 'not_found' };
  }

  return {
    status: 'success',
    data: {
      resolvedName: json.resolvedAddress || resolvedName,
      icon: normalizeVcIcon(day.icon),
      description: day.description,
      tempMin: Math.round(day.tempmin),
      tempMax: Math.round(day.tempmax),
      humidity: Math.round(day.humidity),
      pop: Math.round(day.precipprob),
    },
  };
}
