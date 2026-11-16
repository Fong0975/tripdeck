import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  makeChecklistCategory,
  makeChecklistItem,
  makeChecklistSpec,
  makeTripChecklist,
} from '@/test-utils/fixtures';
import type { TripChecklist } from '@/types';

import ChecklistTable from './ChecklistTable';

function makeChecklist(overrides: Partial<TripChecklist> = {}): TripChecklist {
  return makeTripChecklist({
    occasions: [
      { id: 1, name: 'Occ A', checks: {}, specChecks: {} },
      { id: 2, name: 'Occ B', checks: {}, specChecks: {} },
    ],
    categories: [
      makeChecklistCategory({
        name: 'Category A',
        items: [
          makeChecklistItem({ id: 10, name: 'Item A' }),
          makeChecklistItem({ id: 20, name: 'Item B' }),
        ],
      }),
    ],
    ...overrides,
  });
}

function renderTable(
  checklist: TripChecklist,
  getCheck: (occId: number, id: number) => boolean = () => false,
  getSpecCheck: (occId: number, id: number) => boolean = () => false,
) {
  render(
    <ChecklistTable
      checklist={checklist}
      getCheck={getCheck}
      getSpecCheck={getSpecCheck}
      onToggleCheck={vi.fn()}
      onToggleSpecCheck={vi.fn()}
    />,
  );
}

describe('ChecklistTable', () => {
  it('renders the "項目" header and every occasion name', () => {
    renderTable(makeChecklist());

    expect(screen.getByText('項目')).toBeInTheDocument();
    expect(screen.getByText('Occ A')).toBeInTheDocument();
    expect(screen.getByText('Occ B')).toBeInTheDocument();
  });

  it('shows the checked/total count per occasion based on getCheck', () => {
    renderTable(
      makeChecklist(),
      (occId, itemId) => occId === 1 && itemId === 10,
    );

    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('0 / 2')).toBeInTheDocument();
  });

  it('does not divide by zero when there is nothing to check', () => {
    renderTable(makeChecklist({ categories: [] }));

    expect(screen.getAllByText('0 / 0')).toHaveLength(2);
  });

  it.each([
    {
      name: 'counts each spec of an item as one unit',
      checkedSpecs: [101, 102],
      checkedItems: [],
      occA: '2 / 5',
    },
    {
      name: 'ignores the own check of an item that has specs',
      checkedSpecs: [],
      checkedItems: [10],
      occA: '0 / 5',
    },
    {
      name: 'mixes plain items and specs',
      checkedSpecs: [101],
      checkedItems: [20, 30],
      occA: '3 / 5',
    },
  ])('$name', ({ checkedSpecs, checkedItems, occA }) => {
    const checklist = makeChecklist({
      categories: [
        makeChecklistCategory({
          items: [
            makeChecklistItem({
              id: 10,
              name: 'With specs',
              specs: [
                makeChecklistSpec({ id: 101 }),
                makeChecklistSpec({ id: 102 }),
                makeChecklistSpec({ id: 103 }),
              ],
            }),
            makeChecklistItem({ id: 20, name: 'Plain 1' }),
            makeChecklistItem({ id: 30, name: 'Plain 2' }),
          ],
        }),
      ],
    });

    renderTable(
      checklist,
      (occId, id) => occId === 1 && checkedItems.includes(id),
      (occId, id) => occId === 1 && checkedSpecs.includes(id),
    );

    // Occasion A is the first column, so its count is the first match.
    expect(screen.getAllByText(/^\d+ \/ \d+$/)[0]).toHaveTextContent(occA);
  });

  it('renders the category name and every item within it', () => {
    renderTable(makeChecklist());

    expect(screen.getByText('Category A')).toBeInTheDocument();
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('Item B')).toBeInTheDocument();
  });

  it.each([
    { itemCount: 0, expected: '0 項' },
    { itemCount: 1, expected: '1 項' },
    { itemCount: 3, expected: '3 項' },
  ])(
    'shows "$expected" beside a category holding $itemCount items',
    ({ itemCount, expected }) => {
      const items = Array.from({ length: itemCount }, (_, i) =>
        makeChecklistItem({ id: 100 + i, name: `Item ${i}` }),
      );
      renderTable(
        makeChecklist({
          categories: [makeChecklistCategory({ name: 'Cat', items })],
        }),
      );

      expect(screen.getByText(expected)).toBeInTheDocument();
    },
  );
});
