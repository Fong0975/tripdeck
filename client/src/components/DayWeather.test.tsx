import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DayLocation } from '@/types';
import {
  fetchDailyWeather,
  type WeatherIconCode,
  type WeatherResult,
} from '@/utils/weatherApi';

import DayWeather from './DayWeather';

vi.mock('@/utils/weatherApi', () => ({
  fetchDailyWeather: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchDailyWeather);

const DATE = '2026-08-20';

const makeLocation = (id: number, name: string): DayLocation => ({
  id,
  name,
});

type SuccessData = Extract<WeatherResult, { status: 'success' }>['data'];

const successResult = (
  overrides: Partial<SuccessData> = {},
): WeatherResult => ({
  status: 'success',
  data: {
    resolvedName: 'Tokyo',
    icon: 'clear',
    description: 'Clear sky',
    tempMin: 20,
    tempMax: 28,
    humidity: 55,
    pop: 30,
    ...overrides,
  },
});

// The swipeable wrapper is a bare div with no accessible role/name; it is
// only reachable via its cursor-grab class, which is present when there is
// more than one location.
function getSwipeArea(container: HTMLElement): HTMLElement {
  // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
  return container.querySelector('.cursor-grab') as HTMLElement;
}

beforeEach(() => {
  Element.prototype.setPointerCapture = vi.fn();
  mockedFetch.mockReset();
});

describe('DayWeather', () => {
  it('renders nothing when there are no locations', () => {
    const { container } = render(<DayWeather locations={[]} date={DATE} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the loading text before the fetch resolves', () => {
    mockedFetch.mockReturnValue(new Promise<WeatherResult>(() => {}));

    render(<DayWeather locations={[makeLocation(1, 'Tokyo')]} date={DATE} />);

    expect(screen.getByText('查詢中…')).toBeInTheDocument();
  });

  it.each([
    {
      description: 'not_found',
      result: { status: 'not_found' } as WeatherResult,
      text: '找不到「Tokyo」的天氣資料',
    },
    {
      description: 'out_of_range',
      result: { status: 'out_of_range' } as WeatherResult,
      text: '超出預報範圍（僅支援今日起 5 天內）',
    },
    {
      description: 'error',
      result: { status: 'error' } as WeatherResult,
      text: '天氣資料取得失敗',
    },
  ])('shows the $description message', async ({ result, text }) => {
    mockedFetch.mockResolvedValue(result);

    render(<DayWeather locations={[makeLocation(1, 'Tokyo')]} date={DATE} />);

    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it('shows the error message when the fetch promise rejects', async () => {
    mockedFetch.mockRejectedValue(new Error('network error'));

    render(<DayWeather locations={[makeLocation(1, 'Tokyo')]} date={DATE} />);

    expect(await screen.findByText('天氣資料取得失敗')).toBeInTheDocument();
  });

  it.each([
    { icon: 'partly-cloudy', iconClass: 'lucide-cloud-sun' },
    { icon: 'cloudy', iconClass: 'lucide-cloud' },
    { icon: 'fog', iconClass: 'lucide-cloud-fog' },
    { icon: 'drizzle', iconClass: 'lucide-cloud-drizzle' },
    { icon: 'rain', iconClass: 'lucide-cloud-rain' },
    { icon: 'snow', iconClass: 'lucide-cloud-snow' },
    { icon: 'thunder', iconClass: 'lucide-cloud-lightning' },
  ] as { icon: WeatherIconCode; iconClass: string }[])(
    'renders the $iconClass icon for the $icon weather code',
    async ({ icon, iconClass }) => {
      mockedFetch.mockResolvedValue(successResult({ icon }));
      const { container } = render(
        <DayWeather locations={[makeLocation(1, 'Tokyo')]} date={DATE} />,
      );

      await screen.findByText('Clear sky');

      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
      expect(container.querySelector(`.${iconClass}`)).toBeInTheDocument();
    },
  );

  it('shows description, temps, humidity and pop on success', async () => {
    mockedFetch.mockResolvedValue(successResult());

    render(<DayWeather locations={[makeLocation(1, 'Tokyo')]} date={DATE} />);

    expect(await screen.findByText('Clear sky')).toBeInTheDocument();
    expect(screen.getByText('20° / 28°C')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('hides the precipitation marker when pop is 0', async () => {
    mockedFetch.mockResolvedValue(successResult({ pop: 0 }));

    render(<DayWeather locations={[makeLocation(1, 'Tokyo')]} date={DATE} />);

    expect(await screen.findByText('55%')).toBeInTheDocument();
    expect(screen.getAllByText(/%$/)).toHaveLength(1);
  });

  it('does not render nav controls with a single location', () => {
    mockedFetch.mockResolvedValue({ status: 'error' });

    render(<DayWeather locations={[makeLocation(1, 'Tokyo')]} date={DATE} />);

    expect(screen.queryByLabelText('上一個地區')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('下一個地區')).not.toBeInTheDocument();
  });

  it('navigates between locations via the nav buttons', async () => {
    mockedFetch.mockResolvedValue({ status: 'error' });
    const user = userEvent.setup();
    render(
      <DayWeather
        locations={[makeLocation(1, 'Tokyo'), makeLocation(2, 'Osaka')]}
        date={DATE}
      />,
    );

    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(mockedFetch).toHaveBeenCalledWith('Tokyo', DATE);
    expect(screen.getByLabelText('上一個地區')).toBeDisabled();
    expect(screen.getByLabelText('下一個地區')).toBeEnabled();

    await user.click(screen.getByLabelText('下一個地區'));

    expect(screen.getByText('Osaka')).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedFetch).toHaveBeenCalledWith('Osaka', DATE),
    );
    expect(screen.getByLabelText('下一個地區')).toBeDisabled();
  });

  it('navigates back to the previous location via the previous button', async () => {
    mockedFetch.mockResolvedValue({ status: 'error' });
    const user = userEvent.setup();
    render(
      <DayWeather
        locations={[makeLocation(1, 'Tokyo'), makeLocation(2, 'Osaka')]}
        date={DATE}
      />,
    );

    await user.click(screen.getByLabelText('下一個地區'));
    expect(screen.getByText('Osaka')).toBeInTheDocument();

    await user.click(screen.getByLabelText('上一個地區'));

    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.getByLabelText('上一個地區')).toBeDisabled();
    await waitFor(() =>
      expect(mockedFetch).toHaveBeenCalledWith('Tokyo', DATE),
    );
  });

  it.each([
    {
      description:
        'a leftward drag past the threshold advances to the next location',
      startX: 200,
      endX: 100,
      expectedLocation: 'Osaka',
    },
    {
      description: 'a drag under the threshold leaves the location unchanged',
      startX: 200,
      endX: 180,
      expectedLocation: 'Tokyo',
    },
  ])('$description', ({ startX, endX, expectedLocation }) => {
    mockedFetch.mockResolvedValue({ status: 'error' });
    const { container } = render(
      <DayWeather
        locations={[makeLocation(1, 'Tokyo'), makeLocation(2, 'Osaka')]}
        date={DATE}
      />,
    );

    const swipeArea = getSwipeArea(container);
    fireEvent.pointerDown(swipeArea, { clientX: startX, pointerId: 1 });
    fireEvent.pointerUp(swipeArea, { clientX: endX, pointerId: 1 });

    expect(screen.getByText(expectedLocation)).toBeInTheDocument();
  });

  it('a rightward drag (swipe-right) past the threshold goes back to the previous location', async () => {
    mockedFetch.mockResolvedValue({ status: 'error' });
    const user = userEvent.setup();
    const { container } = render(
      <DayWeather
        locations={[makeLocation(1, 'Tokyo'), makeLocation(2, 'Osaka')]}
        date={DATE}
      />,
    );

    await user.click(screen.getByLabelText('下一個地區'));
    expect(screen.getByText('Osaka')).toBeInTheDocument();

    const swipeArea = getSwipeArea(container);
    fireEvent.pointerDown(swipeArea, { clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(swipeArea, { clientX: 200, pointerId: 1 });

    expect(screen.getByText('Tokyo')).toBeInTheDocument();
  });
});
