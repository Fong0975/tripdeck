import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { showToast } from '@/lib/toast';
import {
  makeAttraction,
  makeConnection,
  makeContent,
  makeDay,
  makeImage,
  makeTrip,
} from '@/test-utils/fixtures';
import { fillDateField, selectFile, submitForm } from '@/test-utils/queries';
import type { DayPlan } from '@/types';
import {
  deleteTripImage,
  getTripContent,
  updateTrip,
  uploadTripImage,
} from '@/utils/storage';

import EditTripModal from './EditTripModal';

vi.mock('@/utils/storage');

vi.mock('@/lib/toast');

const trip = makeTrip({
  id: 5,
  title: 'Old Trip',
  destination: 'Osaka',
  startDate: '2026-01-01',
  endDate: '2026-01-05',
  description: 'notes',
});

const untouchedDays: DayPlan[] = [
  makeDay({ id: 101, day: 1, date: '2026-01-01' }),
  makeDay({ id: 102, day: 2, date: '2026-01-02' }),
  makeDay({ id: 103, day: 3, date: '2026-01-03' }),
];

const impactedDays: DayPlan[] = [
  makeDay({
    id: 104,
    day: 4,
    date: '2026-01-04',
    attractions: [
      makeAttraction({
        id: 1,
        name: 'A',
        images: [makeImage({ filename: 'x.jpg' })],
      }),
    ],
  }),
  makeDay({
    id: 105,
    day: 5,
    date: '2026-01-05',
    connections: [makeConnection({ images: [] })],
    images: [makeImage({ id: 2, filename: 'day.jpg' })],
  }),
];

const allDays = [...untouchedDays, ...impactedDays];

describe('EditTripModal', () => {
  it('renders the trip images and deletes one via the image section', async () => {
    vi.mocked(deleteTripImage).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <EditTripModal
        trip={{
          ...trip,
          images: [makeImage({ filename: 'a.jpg', title: 'Cover' })],
        }}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );

    expect(screen.getByAltText('Cover')).toBeInTheDocument();

    await user.click(screen.getByTitle('刪除圖片'));

    await waitFor(() => expect(deleteTripImage).toHaveBeenCalledWith(5, 1));
    expect(screen.queryByAltText('Cover')).not.toBeInTheDocument();
  });

  it('uploads a new image via the image section', async () => {
    const newImage = makeImage({ id: 2, filename: 'b.jpg', title: 'New' });
    vi.mocked(uploadTripImage).mockResolvedValue(newImage);
    const user = userEvent.setup();
    const { container } = render(
      <EditTripModal trip={trip} onClose={vi.fn()} onUpdated={vi.fn()} />,
    );
    const file = new File(['a'], 'b.jpg');
    selectFile(container, file);
    await user.type(screen.getByPlaceholderText('圖片標題（必填）'), 'New');

    await user.click(screen.getByText('確認上傳'));

    await waitFor(() =>
      expect(uploadTripImage).toHaveBeenCalledWith(5, file, 'New'),
    );
    expect(await screen.findByAltText('New')).toBeInTheDocument();
  });

  it('pre-fills the form with the trip current values', () => {
    const { container } = render(
      <EditTripModal trip={trip} onClose={vi.fn()} onUpdated={vi.fn()} />,
    );

    expect(screen.getByDisplayValue('Old Trip')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Osaka')).toBeInTheDocument();
    expect(screen.getByDisplayValue('notes')).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    const startInput = container.querySelector(
      'input[name="startDate"]',
    ) as HTMLInputElement;
    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    const endInput = container.querySelector(
      'input[name="endDate"]',
    ) as HTMLInputElement;
    expect(startInput.value).toBe('2026-01-01');
    expect(endInput.value).toBe('2026-01-05');
  });

  it('does not auto-shift endDate when startDate changes', () => {
    const { container } = render(
      <EditTripModal trip={trip} onClose={vi.fn()} onUpdated={vi.fn()} />,
    );

    fillDateField(container, 'startDate', '2026-02-01');

    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    const endInput = container.querySelector(
      'input[name="endDate"]',
    ) as HTMLInputElement;
    expect(endInput.value).toBe('2026-01-05');
  });

  it.each([
    {
      description: 'the title is cleared',
      setup: () => {
        fireEvent.change(screen.getByDisplayValue('Old Trip'), {
          target: { value: '   ' },
        });
      },
      expectedError: '請輸入旅程名稱',
    },
    {
      description: 'the travel period is cleared',
      setup: (container: HTMLElement) => {
        fillDateField(container, 'startDate', '');
        fillDateField(container, 'endDate', '');
      },
      expectedError: '請選擇旅遊期間',
    },
    {
      description: 'the end date is before the start date',
      setup: (container: HTMLElement) => {
        fillDateField(container, 'startDate', '2026-01-10');
        fillDateField(container, 'endDate', '2026-01-05');
      },
      expectedError: '結束日期不能早於開始日期',
    },
  ])(
    'shows an error and does not update the trip when $description',
    ({ setup, expectedError }) => {
      const { container } = render(
        <EditTripModal trip={trip} onClose={vi.fn()} onUpdated={vi.fn()} />,
      );
      setup(container);

      submitForm(container);

      expect(screen.getByText(expectedError)).toBeInTheDocument();
      expect(updateTrip).not.toHaveBeenCalled();
    },
  );

  it('submits directly without querying content when the date range only expands', async () => {
    vi.mocked(updateTrip).mockResolvedValue({ ...trip, endDate: '2026-01-10' });
    const onUpdated = vi.fn();
    const { container } = render(
      <EditTripModal
        trip={trip}
        initialContent={makeContent(untouchedDays, trip.id)}
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />,
    );

    fillDateField(container, 'endDate', '2026-01-10');
    submitForm(container);

    await waitFor(() => expect(onUpdated).toHaveBeenCalled());
    expect(getTripContent).not.toHaveBeenCalled();
    expect(
      screen.queryByText('調整日期後將刪除部份行程內容'),
    ).not.toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith('success', '已更新旅程。');
  });

  it('shows a confirmation dialog listing impacted days when shrinking with initialContent provided', async () => {
    const { container } = render(
      <EditTripModal
        trip={trip}
        initialContent={makeContent(allDays, trip.id)}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );

    fillDateField(container, 'endDate', '2026-01-03');
    submitForm(container);

    expect(
      await screen.findByText('調整日期後將刪除部份行程內容'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('1/4（第 4 天）：1 個景點、1 張圖片、0 筆交通紀錄'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('1/5（第 5 天）：0 個景點、1 張圖片、1 筆交通紀錄'),
    ).toBeInTheDocument();
    expect(updateTrip).not.toHaveBeenCalled();
  });

  it('returns to the form without updating when the confirmation is cancelled', async () => {
    const { container } = render(
      <EditTripModal
        trip={trip}
        initialContent={makeContent(allDays, trip.id)}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );
    const user = userEvent.setup();

    fillDateField(container, 'endDate', '2026-01-03');
    submitForm(container);
    await screen.findByText('調整日期後將刪除部份行程內容');

    await user.click(screen.getByText('返回修改'));

    expect(
      screen.queryByText('調整日期後將刪除部份行程內容'),
    ).not.toBeInTheDocument();
    expect(updateTrip).not.toHaveBeenCalled();
  });

  it('updates the trip and reloads content after confirming the destructive change', async () => {
    vi.mocked(updateTrip).mockResolvedValue({ ...trip, endDate: '2026-01-03' });
    const onUpdated = vi.fn();
    const onContentChanged = vi.fn();
    const { container } = render(
      <EditTripModal
        trip={trip}
        initialContent={makeContent(allDays, trip.id)}
        onClose={vi.fn()}
        onUpdated={onUpdated}
        onContentChanged={onContentChanged}
      />,
    );
    const user = userEvent.setup();

    fillDateField(container, 'endDate', '2026-01-03');
    submitForm(container);
    await screen.findByText('調整日期後將刪除部份行程內容');

    await user.click(screen.getByText('確定刪除並儲存'));

    await waitFor(() => {
      expect(updateTrip).toHaveBeenCalledWith(trip.id, {
        title: 'Old Trip',
        destination: 'Osaka',
        startDate: '2026-01-01',
        endDate: '2026-01-03',
        description: 'notes',
      });
    });
    expect(onUpdated).toHaveBeenCalled();
    expect(onContentChanged).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('success', '已更新旅程。');
  });

  it('falls back to fetching content when no initialContent is provided', async () => {
    vi.mocked(getTripContent).mockResolvedValue(makeContent(allDays, trip.id));
    const { container } = render(
      <EditTripModal trip={trip} onClose={vi.fn()} onUpdated={vi.fn()} />,
    );

    fillDateField(container, 'endDate', '2026-01-03');
    submitForm(container);

    expect(
      await screen.findByText('調整日期後將刪除部份行程內容'),
    ).toBeInTheDocument();
    expect(getTripContent).toHaveBeenCalledWith(trip.id);
  });

  it('submits directly when content cannot be loaded, without blocking on a confirmation', async () => {
    vi.mocked(getTripContent).mockResolvedValue(null);
    vi.mocked(updateTrip).mockResolvedValue({ ...trip, endDate: '2026-01-03' });
    const onUpdated = vi.fn();
    const { container } = render(
      <EditTripModal trip={trip} onClose={vi.fn()} onUpdated={onUpdated} />,
    );

    fillDateField(container, 'endDate', '2026-01-03');
    submitForm(container);

    await waitFor(() => expect(onUpdated).toHaveBeenCalled());
    expect(
      screen.queryByText('調整日期後將刪除部份行程內容'),
    ).not.toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith('success', '已更新旅程。');
  });

  it('shows an error and does not report to the parent when updateTrip fails', async () => {
    vi.mocked(updateTrip).mockRejectedValue(new Error('network error'));
    const onUpdated = vi.fn();
    const { container } = render(
      <EditTripModal
        trip={trip}
        initialContent={makeContent(untouchedDays, trip.id)}
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />,
    );

    fillDateField(container, 'endDate', '2026-01-10');
    submitForm(container);

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        'error',
        '更新旅程失敗，請稍後再試',
      ),
    );
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<EditTripModal trip={trip} onClose={onClose} onUpdated={vi.fn()} />);

    await user.click(screen.getByText('取消'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
