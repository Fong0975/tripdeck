import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MapNotice from './MapNotice';

const IDLE = {
  resolving: false,
  failed: false,
  geocodeExhausted: false,
  unlocatedCount: 0,
  showOtherDays: true,
  onToggleOtherDays: vi.fn(),
};

describe('MapNotice', () => {
  it('always shows the pin legend', () => {
    render(<MapNotice {...IDLE} />);

    expect(screen.getByText('當天景點')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '其他天' })).toBeInTheDocument();
  });

  it.each([
    { showOtherDays: true, dotVisible: true },
    { showOtherDays: false, dotVisible: false },
  ])(
    'reflects showOtherDays=$showOtherDays on the toggle and its dot',
    ({ showOtherDays, dotVisible }) => {
      render(<MapNotice {...IDLE} showOtherDays={showOtherDays} />);

      expect(screen.getByRole('button', { name: '其他天' })).toHaveAttribute(
        'aria-pressed',
        String(showOtherDays),
      );
      expect(screen.queryByTestId('other-days-dot') !== null).toBe(dotVisible);
    },
  );

  it('calls onToggleOtherDays when the other-days button is clicked', async () => {
    const user = userEvent.setup();
    const onToggleOtherDays = vi.fn();
    render(<MapNotice {...IDLE} onToggleOtherDays={onToggleOtherDays} />);

    await user.click(screen.getByRole('button', { name: '其他天' }));

    expect(onToggleOtherDays).toHaveBeenCalledTimes(1);
  });

  it('shows no status line when there is nothing to explain', () => {
    render(<MapNotice {...IDLE} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each([
    {
      description: 'locations are being resolved',
      props: { resolving: true },
      message: '正在定位景點…',
    },
    {
      description: 'the resolve request failed',
      props: { failed: true },
      message: '無法取得景點座標，僅顯示已知的位置',
    },
    {
      description: 'some attractions cannot be located',
      props: { unlocatedCount: 2 },
      message: '有 2 個景點無法在地圖上定位',
    },
    {
      description: 'some cannot be located and name lookups ran out',
      props: { unlocatedCount: 1, geocodeExhausted: true },
      message: '有 1 個景點無法在地圖上定位（今日地點查詢額度已用完）',
    },
    {
      description: 'resolving while others are unlocated (resolving wins)',
      props: { resolving: true, unlocatedCount: 3 },
      message: '正在定位景點…',
    },
    {
      description: 'a failure and unlocated attractions (failure wins)',
      props: { failed: true, unlocatedCount: 3 },
      message: '無法取得景點座標，僅顯示已知的位置',
    },
  ])('explains it when $description', ({ props, message }) => {
    render(<MapNotice {...IDLE} {...props} />);

    expect(screen.getByRole('status')).toHaveTextContent(message);
  });

  it('does not mention the lookup quota when everything is located', () => {
    render(<MapNotice {...IDLE} geocodeExhausted />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
