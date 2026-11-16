import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeChecklistSpec } from '@/test-utils/fixtures';
import type { ChecklistOccasion } from '@/types';

import ChecklistSpecRow from './ChecklistSpecRow';

const occasions: ChecklistOccasion[] = [
  { id: 1, name: 'Occ A', checks: {}, specChecks: {} },
  { id: 2, name: 'Occ B', checks: {}, specChecks: {} },
];

function renderRow(
  getSpecCheck: (occId: number, specId: number) => boolean = () => false,
  onToggleSpecCheck = vi.fn(),
) {
  render(
    <table>
      <tbody>
        <ChecklistSpecRow
          spec={makeChecklistSpec({
            id: 101,
            name: 'Spec A',
            storage_location: '隨身',
          })}
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
  it('shows the one-based index, name and storage badges', () => {
    renderRow();

    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('Spec A')).toBeInTheDocument();
    expect(screen.getByText('隨身')).toBeInTheDocument();
  });

  it('reflects getSpecCheck for each occasion', () => {
    renderRow((occId, specId) => occId === 1 && specId === 101);

    expect(
      screen.getByRole('checkbox', { name: 'Spec A - Occ A' }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Spec A - Occ B' }),
    ).not.toBeChecked();
  });

  it('calls onToggleSpecCheck with the occasion and spec id', async () => {
    const user = userEvent.setup();
    const { onToggleSpecCheck } = renderRow();

    await user.click(screen.getByRole('checkbox', { name: 'Spec A - Occ B' }));

    expect(onToggleSpecCheck).toHaveBeenCalledTimes(1);
    expect(onToggleSpecCheck).toHaveBeenCalledWith(2, 101);
  });
});
