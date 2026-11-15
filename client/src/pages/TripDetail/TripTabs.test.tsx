import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TripTabs from './TripTabs';

describe('TripTabs', () => {
  it.each([
    {
      activeTab: 'itinerary' as const,
      active: '行程規劃',
      inactive: '行李清單',
    },
    {
      activeTab: 'checklist' as const,
      active: '行李清單',
      inactive: '行程規劃',
    },
  ])(
    'highlights only the $activeTab tab',
    ({ activeTab, active, inactive }) => {
      render(<TripTabs activeTab={activeTab} onSelect={vi.fn()} />);

      expect(screen.getByRole('button', { name: active })).toHaveClass(
        'border-primary',
      );
      expect(screen.getByRole('button', { name: inactive })).toHaveClass(
        'border-transparent',
      );
    },
  );

  it.each([
    { label: '行程規劃', expected: 'itinerary' },
    { label: '行李清單', expected: 'checklist' },
  ])(
    'selects $expected when "$label" is clicked',
    async ({ label, expected }) => {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      render(<TripTabs activeTab='itinerary' onSelect={onSelect} />);

      await user.click(screen.getByRole('button', { name: label }));

      expect(onSelect).toHaveBeenCalledWith(expected);
    },
  );
});
