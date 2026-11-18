import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeChecklistSpec } from '@/test-utils/fixtures';
import type { ChecklistOccasion } from '@/types';

import ChecklistSpecRow from './ChecklistSpecRow';
import type { CheckGetter } from './checkUnits';

const occasions: ChecklistOccasion[] = [
  { id: 1, name: 'Occ A', checks: {}, specChecks: {} },
  { id: 2, name: 'Occ B', checks: {}, specChecks: {} },
];

function renderRow({
  getSpecCheck = () => false,
  location = '隨身',
  showLocation = true,
}: {
  getSpecCheck?: CheckGetter;
  location?: string;
  showLocation?: boolean;
} = {}) {
  const onToggleSpecCheck = vi.fn();
  render(
    <table>
      <tbody>
        <ChecklistSpecRow
          spec={makeChecklistSpec({
            id: 101,
            name: 'Spec A',
            storage_location: '隨身',
          })}
          location={location}
          showLocation={showLocation}
          specIndex={1}
          itemIndex={0}
          isLast
          occasions={occasions}
          getSpecCheck={getSpecCheck}
          onToggleSpecCheck={onToggleSpecCheck}
        />
      </tbody>
    </table>,
  );
  return { onToggleSpecCheck };
}

describe('ChecklistSpecRow', () => {
  it('shows the one-based index, name and location badge', () => {
    renderRow();

    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('Spec A')).toBeInTheDocument();
    expect(screen.getByText('隨身')).toBeInTheDocument();
  });

  it.each([
    {
      description: 'hides the badge when showLocation is false',
      location: '託運',
      showLocation: false,
      expectedBadge: false,
    },
    {
      description: 'hides the badge for the empty location',
      location: '',
      showLocation: true,
      expectedBadge: false,
    },
    {
      description: 'shows the badge for a storage location',
      location: '託運',
      showLocation: true,
      expectedBadge: true,
    },
  ])('$description', ({ location, showLocation, expectedBadge }) => {
    renderRow({ location, showLocation });

    expect(screen.queryByText('託運') !== null).toBe(expectedBadge);
  });

  it.each([
    { location: '託運', label: 'Spec A（託運） - Occ A' },
    { location: '隨身', label: 'Spec A（隨身） - Occ A' },
    { location: '', label: 'Spec A - Occ A' },
  ])(
    'names the checkbox "$label" for location "$location"',
    ({ location, label }) => {
      renderRow({ location });

      expect(screen.getByRole('checkbox', { name: label })).toBeInTheDocument();
    },
  );

  it('reads getSpecCheck with the row location for each occasion', () => {
    const getSpecCheck = vi.fn<CheckGetter>(
      (occId, specId, location) =>
        occId === 1 && specId === 101 && location === '隨身',
    );
    renderRow({ getSpecCheck });

    expect(
      screen.getByRole('checkbox', { name: 'Spec A（隨身） - Occ A' }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Spec A（隨身） - Occ B' }),
    ).not.toBeChecked();
    expect(getSpecCheck).toHaveBeenCalledWith(1, 101, '隨身');
    expect(getSpecCheck).toHaveBeenCalledWith(2, 101, '隨身');
  });

  it.each([{ location: '託運' }, { location: '隨身' }, { location: '' }])(
    'calls onToggleSpecCheck with the occasion, spec id and location "$location"',
    async ({ location }) => {
      const user = userEvent.setup();
      const { onToggleSpecCheck } = renderRow({ location });

      const name = location
        ? `Spec A（${location}） - Occ B`
        : 'Spec A - Occ B';
      await user.click(screen.getByRole('checkbox', { name }));

      expect(onToggleSpecCheck).toHaveBeenCalledTimes(1);
      expect(onToggleSpecCheck).toHaveBeenCalledWith(2, 101, location);
    },
  );
});
