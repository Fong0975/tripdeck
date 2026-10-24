import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MapNotice from './MapNotice';

const IDLE = {
  resolving: false,
  failed: false,
  geocodeExhausted: false,
  unlocatedCount: 0,
};

describe('MapNotice', () => {
  it('always shows the pin legend', () => {
    render(<MapNotice {...IDLE} />);

    expect(screen.getByText('當天景點')).toBeInTheDocument();
    expect(screen.getByText('其他天')).toBeInTheDocument();
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
