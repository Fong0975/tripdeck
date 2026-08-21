import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Trip } from '@/types';
import { createTrip } from '@/utils/storage';

import AddTripModal from './AddTripModal';

vi.mock('@/utils/storage', () => ({
  createTrip: vi.fn(),
}));

// Pin the timezone so the startDate -> endDate auto-calculation (which round
// trips through Date/toISOString) produces a deterministic result.
process.env.TZ = 'UTC';

beforeEach(() => {
  vi.clearAllMocks();
});

// The start/end date <input type="date"> fields have no <label htmlFor>
// association in the source, so they can't be reached via getByLabelText —
// querying by their `name` attribute is the most reliable option available.
function fillDateField(container: HTMLElement, name: string, value: string) {
  // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
  const input = container.querySelector(`input[name="${name}"]`)!;
  fireEvent.change(input, { target: { value } });
}

// Some fixtures in this file deliberately set an endDate before the
// endDate input's `min` (= startDate) to exercise the component's own
// JS-level validation. Clicking the submit button would first run the
// browser's native constraint validation and silently block the submit
// event before it ever reaches React, so the form is submitted directly
// instead — this exercises the same onSubmit handler without going
// through that native gate.
function submitForm(container: HTMLElement) {
  // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
  const form = container.querySelector('form')!;
  fireEvent.submit(form);
}

describe('AddTripModal', () => {
  it.each([
    {
      description: 'the title is blank',
      setup: (container: HTMLElement) => {
        fillDateField(container, 'startDate', '2026-01-01');
      },
      expectedError: '請輸入旅程名稱',
    },
    {
      description: 'the travel period is not selected',
      setup: () => {
        fireEvent.change(screen.getByPlaceholderText('例：東京五日遊'), {
          target: { value: 'My Trip' },
        });
      },
      expectedError: '請選擇旅遊期間',
    },
    {
      description: 'the end date is before the start date',
      setup: (container: HTMLElement) => {
        fireEvent.change(screen.getByPlaceholderText('例：東京五日遊'), {
          target: { value: 'My Trip' },
        });
        fillDateField(container, 'startDate', '2026-01-10');
        fillDateField(container, 'endDate', '2026-01-05');
      },
      expectedError: '結束日期不能早於開始日期',
    },
  ])(
    'shows an error and does not create a trip when $description',
    ({ setup, expectedError }) => {
      const { container } = render(
        <AddTripModal onClose={vi.fn()} onAdded={vi.fn()} />,
      );
      setup(container);

      submitForm(container);

      expect(screen.getByText(expectedError)).toBeInTheDocument();
      expect(createTrip).not.toHaveBeenCalled();
    },
  );

  it('auto-fills the end date to 3 days after the start date', () => {
    const { container } = render(
      <AddTripModal onClose={vi.fn()} onAdded={vi.fn()} />,
    );

    fillDateField(container, 'startDate', '2026-01-01');

    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    const endInput = container.querySelector(
      'input[name="endDate"]',
    ) as HTMLInputElement;
    expect(endInput.value).toBe('2026-01-04');
  });

  it('creates the trip and reports it to the parent on success', async () => {
    const trip: Trip = {
      id: 1,
      title: 'My Trip',
      destination: 'Japan',
      startDate: '2026-01-01',
      endDate: '2026-01-04',
      createdAt: '2026-01-01',
    };
    vi.mocked(createTrip).mockResolvedValue(trip);
    const onAdded = vi.fn();
    const { container } = render(
      <AddTripModal onClose={vi.fn()} onAdded={onAdded} />,
    );

    fireEvent.change(screen.getByPlaceholderText('例：東京五日遊'), {
      target: { value: '  My Trip  ' },
    });
    fillDateField(container, 'startDate', '2026-01-01');
    submitForm(container);

    expect(createTrip).toHaveBeenCalledWith({
      title: 'My Trip',
      destination: undefined,
      startDate: '2026-01-01',
      endDate: '2026-01-04',
      description: undefined,
    });
    await waitFor(() => {
      expect(onAdded).toHaveBeenCalledWith(trip);
    });
  });

  it('shows an error and does not report to the parent on failure', async () => {
    vi.mocked(createTrip).mockRejectedValue(new Error('network error'));
    const onAdded = vi.fn();
    const { container } = render(
      <AddTripModal onClose={vi.fn()} onAdded={onAdded} />,
    );

    fireEvent.change(screen.getByPlaceholderText('例：東京五日遊'), {
      target: { value: 'My Trip' },
    });
    fillDateField(container, 'startDate', '2026-01-01');
    submitForm(container);

    expect(
      await screen.findByText('建立旅程失敗，請稍後再試'),
    ).toBeInTheDocument();
    expect(onAdded).not.toHaveBeenCalled();
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AddTripModal onClose={onClose} onAdded={vi.fn()} />);

    await user.click(screen.getByText('取消'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
