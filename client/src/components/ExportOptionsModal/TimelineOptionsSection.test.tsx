import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type {
  DaysPerImage,
  TimelineExportOptions,
} from '@/utils/exportToDocx/exportOptions';

import TimelineOptionsSection from './TimelineOptionsSection';

function renderSection(value: TimelineExportOptions) {
  const onChange = vi.fn();
  render(<TimelineOptionsSection value={value} onChange={onChange} />);
  return { onChange };
}

describe('TimelineOptionsSection', () => {
  it('shows the current settings', () => {
    renderSection({ enabled: true, daysPerImage: 2 });

    expect(screen.getByLabelText('包含時間軸圖片')).toBeChecked();
    expect(screen.getByLabelText('每張圖片包含的天數')).toHaveValue('2');
  });

  it('offers every days-per-image choice', () => {
    renderSection({ enabled: true, daysPerImage: 4 });

    expect(
      screen.getAllByRole('option').map(option => option.textContent),
    ).toEqual(['1 天', '2 天', '3 天', '4 天', '全部']);
  });

  it.each([
    { enabled: true, disabled: false },
    { enabled: false, disabled: true },
  ])(
    'sets the days select disabled=$disabled when enabled is $enabled',
    ({ enabled, disabled }) => {
      renderSection({ enabled, daysPerImage: 4 });

      const select = screen.getByLabelText('每張圖片包含的天數');

      if (disabled) {
        expect(select).toBeDisabled();
      } else {
        expect(select).toBeEnabled();
      }
    },
  );

  it('reports the toggled inclusion and keeps the days setting', async () => {
    const user = userEvent.setup();
    const { onChange } = renderSection({ enabled: true, daysPerImage: 3 });

    await user.click(screen.getByLabelText('包含時間軸圖片'));

    expect(onChange).toHaveBeenCalledWith({ enabled: false, daysPerImage: 3 });
  });

  it.each<{ label: string; expected: DaysPerImage }>([
    { label: '1 天', expected: 1 },
    { label: '3 天', expected: 3 },
    { label: '全部', expected: 'all' },
  ])(
    'reports $expected when "$label" is chosen',
    async ({ label, expected }) => {
      const user = userEvent.setup();
      const { onChange } = renderSection({ enabled: true, daysPerImage: 4 });

      await user.selectOptions(
        screen.getByLabelText('每張圖片包含的天數'),
        label,
      );

      expect(onChange).toHaveBeenCalledWith({
        enabled: true,
        daysPerImage: expected,
      });
    },
  );
});
