import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ChecklistItem, ChecklistOccasion } from '@/types';

import ChecklistItemRow from './ChecklistItemRow';

function makeItem(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: 10,
    name: 'Item A',
    quantity: null,
    notes: null,
    storage_location: null,
    specs: [],
    ...overrides,
  };
}

const occasions: ChecklistOccasion[] = [
  { id: 1, name: 'Occ A', checks: {} },
  { id: 2, name: 'Occ B', checks: {} },
];

function renderRow(
  item: ChecklistItem,
  getCheck: (occId: number, itemId: number) => boolean = () => false,
  onToggleCheck = vi.fn(),
) {
  render(
    <table>
      <tbody>
        <ChecklistItemRow
          item={item}
          index={0}
          occasions={occasions}
          getCheck={getCheck}
          onToggleCheck={onToggleCheck}
        />
      </tbody>
    </table>,
  );
  return { onToggleCheck };
}

describe('ChecklistItemRow', () => {
  it.each([
    { description: 'a quantity is set', quantity: 3, expected: '× 3' },
    { description: 'no quantity is set', quantity: null, expected: '些許' },
  ])('shows "$expected" when $description', ({ quantity, expected }) => {
    renderRow(makeItem({ quantity }));

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('shows notes when present', () => {
    renderRow(makeItem({ notes: 'Remember this' }));

    expect(screen.getByText('Remember this')).toBeInTheDocument();
  });

  it('shows storage badges when a storage location is set', () => {
    renderRow(makeItem({ storage_location: '託運' }));

    expect(screen.getByText('託運')).toBeInTheDocument();
  });

  it('renders without a spec list when specs is undefined', () => {
    renderRow(makeItem({ specs: undefined }));

    expect(screen.queryByText('1.')).not.toBeInTheDocument();
  });

  it('shows every spec with its index and storage badges', () => {
    renderRow(
      makeItem({
        specs: [{ id: 100, name: 'Spec A', storage_location: '隨身' }],
      }),
    );

    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('Spec A')).toBeInTheDocument();
    expect(screen.getByText('隨身')).toBeInTheDocument();
  });

  it('reflects the checked state from getCheck for each occasion', () => {
    renderRow(makeItem(), (occId, itemId) => occId === 1 && itemId === 10);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });

  it('calls onToggleCheck when a cell (outside the checkbox) is clicked', async () => {
    const user = userEvent.setup();
    const { onToggleCheck } = renderRow(makeItem());

    const checkbox = screen.getAllByRole('checkbox')[0];
    // The cell's own onClick handler is what's under test here, so it must
    // be targeted directly rather than the checkbox (which stops propagation).
    // eslint-disable-next-line testing-library/no-node-access
    const cell = checkbox.closest('td') as HTMLElement;
    await user.click(cell);

    expect(onToggleCheck).toHaveBeenCalledWith(1, 10);
  });

  it('calls onToggleCheck exactly once when the checkbox itself is clicked', async () => {
    const user = userEvent.setup();
    const { onToggleCheck } = renderRow(makeItem());

    await user.click(screen.getAllByRole('checkbox')[0]);

    expect(onToggleCheck).toHaveBeenCalledTimes(1);
    expect(onToggleCheck).toHaveBeenCalledWith(1, 10);
  });
});
