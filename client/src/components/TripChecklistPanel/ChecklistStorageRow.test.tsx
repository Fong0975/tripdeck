import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { makeChecklistItem, makeChecklistSpec } from '@/test-utils/fixtures';
import type { ChecklistOccasion } from '@/types';

import ChecklistStorageRow from './ChecklistStorageRow';
import type { StorageUnit } from './groupByStorage';

const occasions: ChecklistOccasion[] = [
  { id: 1, name: 'Occ A', checks: {}, specChecks: {} },
  { id: 2, name: 'Occ B', checks: {}, specChecks: {} },
];

const itemUnit: StorageUnit = {
  kind: 'item',
  categoryId: 1,
  categoryName: 'Clothes',
  item: makeChecklistItem({
    id: 10,
    name: 'Jacket',
    quantity: 2,
    notes: 'Warm one',
  }),
};

const specItem = makeChecklistItem({ id: 20, name: 'Charger' });
const specUnit: StorageUnit = {
  kind: 'spec',
  categoryId: 2,
  categoryName: 'Gadgets',
  item: specItem,
  spec: makeChecklistSpec({ id: 201, name: 'USB-C' }),
};

function renderRow(
  unit: StorageUnit,
  getCheck: (occId: number, id: number) => boolean = () => false,
  getSpecCheck: (occId: number, id: number) => boolean = () => false,
) {
  const onToggleCheck = vi.fn();
  const onToggleSpecCheck = vi.fn();
  render(
    <table>
      <tbody>
        <ChecklistStorageRow
          unit={unit}
          index={0}
          occasions={occasions}
          getCheck={getCheck}
          getSpecCheck={getSpecCheck}
          onToggleCheck={onToggleCheck}
          onToggleSpecCheck={onToggleSpecCheck}
        />
      </tbody>
    </table>,
  );
  return { onToggleCheck, onToggleSpecCheck };
}

describe('ChecklistStorageRow', () => {
  it.each([
    {
      description: 'an item unit',
      unit: itemUnit,
      texts: ['Jacket', '× 2', 'Warm one'],
    },
    {
      description: 'a spec unit',
      unit: specUnit,
      texts: ['Charger ›', 'USB-C'],
    },
  ])('shows the names for $description', ({ unit, texts }) => {
    renderRow(unit);

    texts.forEach(text => {
      expect(screen.getByText(text)).toBeInTheDocument();
    });
  });

  it('shows "些許" for an item without a quantity', () => {
    renderRow({
      ...itemUnit,
      item: makeChecklistItem({ id: 11, name: 'Socks', quantity: null }),
    });

    expect(screen.getByText('些許')).toBeInTheDocument();
  });

  it.each([
    {
      description: 'an item unit reads getCheck',
      unit: itemUnit,
      label: 'Jacket - Occ A',
      getCheck: (occId: number, id: number) => occId === 1 && id === 10,
      getSpecCheck: () => false,
    },
    {
      description: 'a spec unit reads getSpecCheck',
      unit: specUnit,
      label: 'USB-C - Occ A',
      getCheck: () => false,
      getSpecCheck: (occId: number, id: number) => occId === 1 && id === 201,
    },
  ])('$description', ({ unit, label, getCheck, getSpecCheck }) => {
    renderRow(unit, getCheck, getSpecCheck);

    expect(screen.getByRole('checkbox', { name: label })).toBeChecked();
  });

  it('calls onToggleCheck with the occasion and item id for an item unit', async () => {
    const user = userEvent.setup();
    const { onToggleCheck, onToggleSpecCheck } = renderRow(itemUnit);

    await user.click(screen.getByRole('checkbox', { name: 'Jacket - Occ B' }));

    expect(onToggleCheck).toHaveBeenCalledWith(2, 10);
    expect(onToggleSpecCheck).not.toHaveBeenCalled();
  });

  it('calls onToggleSpecCheck with the occasion and spec id for a spec unit', async () => {
    const user = userEvent.setup();
    const { onToggleCheck, onToggleSpecCheck } = renderRow(specUnit);

    await user.click(screen.getByRole('checkbox', { name: 'USB-C - Occ B' }));

    expect(onToggleSpecCheck).toHaveBeenCalledWith(2, 201);
    expect(onToggleCheck).not.toHaveBeenCalled();
  });
});
