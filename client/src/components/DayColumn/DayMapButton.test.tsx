import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format, parseISO } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';

import type { MapsAvailability } from '@/utils/mapsApi';

import DayMapButton from './DayMapButton';

const RESET_AT = '2026-10-25T07:00:00.000Z';

function renderButton(availability: MapsAvailability, onClick = vi.fn()) {
  render(<DayMapButton availability={availability} onClick={onClick} />);
  return { onClick };
}

describe('DayMapButton', () => {
  it('renders nothing while the map is unavailable', () => {
    renderButton({ state: 'unavailable' });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens the map when ready', async () => {
    const user = userEvent.setup();
    const { onClick } = renderButton({ state: 'ready' });

    const button = screen.getByLabelText('檢視當日地圖');
    await user.click(button);

    expect(button).toHaveAttribute('title', '檢視當日地圖');
    expect(button).toHaveAttribute('aria-disabled', 'false');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      description: 'a reset time',
      resetAt: RESET_AT,
      tooltip: `今日地圖額度已用完，將於 ${format(parseISO(RESET_AT), 'M/d HH:mm')} 重置`,
    },
    {
      description: 'no reset time',
      resetAt: null,
      tooltip: '今日地圖額度已用完，請明天再試',
    },
    {
      description: 'an unparseable reset time',
      resetAt: 'garbage',
      tooltip: '今日地圖額度已用完，請明天再試',
    },
  ])(
    'is inert and explains why when exhausted with $description',
    async ({ resetAt, tooltip }) => {
      const user = userEvent.setup();
      const { onClick } = renderButton({ state: 'exhausted', resetAt });

      const button = screen.getByLabelText('檢視當日地圖');
      await user.click(button);

      expect(button).toHaveAttribute('title', tooltip);
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(onClick).not.toHaveBeenCalled();
    },
  );
});
