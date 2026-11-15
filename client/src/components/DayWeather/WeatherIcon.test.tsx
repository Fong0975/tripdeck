import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { WeatherIconCode } from '@/utils/weatherApi';

import WeatherIcon from './WeatherIcon';

describe('WeatherIcon', () => {
  it.each([
    { code: 'clear', iconClass: 'lucide-sun', tint: 'text-yellow-400' },
    {
      code: 'partly-cloudy',
      iconClass: 'lucide-cloud-sun',
      tint: 'text-yellow-400',
    },
    { code: 'cloudy', iconClass: 'lucide-cloud', tint: 'text-slate-400' },
    { code: 'fog', iconClass: 'lucide-cloud-fog', tint: 'text-slate-400' },
    {
      code: 'drizzle',
      iconClass: 'lucide-cloud-drizzle',
      tint: 'text-blue-400',
    },
    { code: 'rain', iconClass: 'lucide-cloud-rain', tint: 'text-blue-500' },
    { code: 'snow', iconClass: 'lucide-cloud-snow', tint: 'text-sky-300' },
    {
      code: 'thunder',
      iconClass: 'lucide-cloud-lightning',
      tint: 'text-violet-400',
    },
    {
      code: 'unknown' as unknown as WeatherIconCode,
      iconClass: 'lucide-cloud',
      tint: 'text-slate-400',
    },
  ] as { code: WeatherIconCode; iconClass: string; tint: string }[])(
    'renders $iconClass tinted $tint for the $code code',
    ({ code, iconClass, tint }) => {
      const { container } = render(<WeatherIcon code={code} size={20} />);

      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass(iconClass, tint);
      expect(svg).toHaveAttribute('width', '20');
    },
  );
});
