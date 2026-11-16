import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ViewMode } from './viewMode';
import ViewModeToggle from './ViewModeToggle';

describe('ViewModeToggle', () => {
  it.each<{ value: ViewMode; pressed: string; unpressed: string }>([
    { value: 'category', pressed: '依分類', unpressed: '依存放位置' },
    { value: 'storage', pressed: '依存放位置', unpressed: '依分類' },
  ])(
    'marks only the "$pressed" button as pressed for $value',
    ({ value, pressed, unpressed }) => {
      render(<ViewModeToggle value={value} onChange={vi.fn()} />);

      expect(screen.getByRole('button', { name: pressed })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByRole('button', { name: unpressed })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    },
  );

  it.each<{ label: string; expected: ViewMode }>([
    { label: '依分類', expected: 'category' },
    { label: '依存放位置', expected: 'storage' },
  ])(
    'calls onChange with "$expected" when "$label" is clicked',
    async ({ label, expected }) => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ViewModeToggle value='category' onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: label }));

      expect(onChange).toHaveBeenCalledWith(expected);
    },
  );
});
