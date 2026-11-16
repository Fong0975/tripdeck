import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { DayMapExportOptions } from '@/utils/exportToDocx/exportOptions';

import DayMapOptionsSection from './DayMapOptionsSection';

function renderSection(value: DayMapExportOptions) {
  const onChange = vi.fn();
  render(<DayMapOptionsSection value={value} onChange={onChange} />);
  return { onChange };
}

describe('DayMapOptionsSection', () => {
  it.each([true, false])('shows the checkbox as checked=%s', enabled => {
    renderSection({ enabled });

    const checkbox = screen.getByLabelText('包含每日景點地圖圖片');

    if (enabled) {
      expect(checkbox).toBeChecked();
    } else {
      expect(checkbox).not.toBeChecked();
    }
  });

  it.each([
    { enabled: true, expected: false },
    { enabled: false, expected: true },
  ])(
    'reports enabled=$expected when toggled from $enabled',
    async ({ enabled, expected }) => {
      const user = userEvent.setup();
      const { onChange } = renderSection({ enabled });

      await user.click(screen.getByLabelText('包含每日景點地圖圖片'));

      expect(onChange).toHaveBeenCalledWith({ enabled: expected });
    },
  );
});
