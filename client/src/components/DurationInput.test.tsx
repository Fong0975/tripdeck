import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DurationInput from './DurationInput';

function renderInput(value: number) {
  const onChange = vi.fn();
  render(<DurationInput value={value} onChange={onChange} />);
  const [hoursInput, minutesInput] = screen.getAllByRole('spinbutton');
  return { onChange, hoursInput, minutesInput };
}

describe('DurationInput', () => {
  it.each([
    { value: 0, hours: 0, minutes: 0 },
    { value: 45, hours: 0, minutes: 45 },
    { value: 90, hours: 1, minutes: 30 },
    { value: 120, hours: 2, minutes: 0 },
  ])(
    'splits $value minutes into $hours h / $minutes m',
    ({ value, hours, minutes }) => {
      const { hoursInput, minutesInput } = renderInput(value);

      expect(hoursInput).toHaveValue(hours);
      expect(minutesInput).toHaveValue(minutes);
    },
  );

  it('renders the default label and accepts a custom one', () => {
    const { unmount } = render(<DurationInput value={0} onChange={vi.fn()} />);
    expect(screen.getByText('所需時間')).toBeInTheDocument();
    unmount();

    render(<DurationInput value={0} onChange={vi.fn()} label='停留時間' />);
    expect(screen.getByText('停留時間')).toBeInTheDocument();
  });

  it.each([
    { field: 'hours', input: '2', expected: 2 * 60 + 30 },
    { field: 'hours', input: '', expected: 30 },
    { field: 'hours', input: '-3', expected: 30 },
    { field: 'minutes', input: '15', expected: 60 + 15 },
    { field: 'minutes', input: '75', expected: 60 + 59 },
    { field: 'minutes', input: '', expected: 60 },
    { field: 'minutes', input: '-5', expected: 60 },
  ] as const)(
    'reports $expected total minutes when $field is set to "$input"',
    ({ field, input, expected }) => {
      const { onChange, hoursInput, minutesInput } = renderInput(90);

      fireEvent.change(field === 'hours' ? hoursInput : minutesInput, {
        target: { value: input },
      });

      expect(onChange).toHaveBeenCalledWith(expected);
    },
  );
});
