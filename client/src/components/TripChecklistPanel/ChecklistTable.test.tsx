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
import type { ViewMode } from './viewMode';

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
  viewMode?: ViewMode,
) {
  render(
    <ChecklistTable
      checklist={checklist}
      getCheck={getCheck}
      getSpecCheck={getSpecCheck}
      onToggleCheck={vi.fn()}
      onToggleSpecCheck={vi.fn()}
      viewMode={viewMode}
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

  describe('storage view', () => {
    const storageChecklist = makeChecklist({
      categories: [
        makeChecklistCategory({
          name: 'Clothes',
          items: [
            makeChecklistItem({
              id: 10,
              name: 'Jacket',
              storage_location: '託運,隨身',
            }),
            makeChecklistItem({ id: 20, name: 'Socks' }),
          ],
        }),
        makeChecklistCategory({
          id: 2,
          name: 'Gadgets',
          items: [
            makeChecklistItem({
              id: 30,
              name: 'Charger',
              specs: [
                makeChecklistSpec({
                  id: 301,
                  name: 'USB-C',
                  storage_location: '隨身',
                }),
              ],
            }),
          ],
        }),
      ],
    });

    it.each([
      { header: '託運', count: '1 項' },
      { header: '隨身', count: '2 項' },
      { header: '未指定位置', count: '1 項' },
    ])('shows the "$header" group with "$count"', ({ header, count }) => {
      renderTable(storageChecklist, undefined, undefined, 'storage');

      // eslint-disable-next-line testing-library/no-node-access
      const row = screen.getByText(header).closest('tr') as HTMLElement;
      expect(row).toHaveTextContent(count);
    });

    it('lists a multi-location item under each of its groups', () => {
      renderTable(storageChecklist, undefined, undefined, 'storage');

      expect(screen.getAllByText('Jacket')).toHaveLength(2);
    });

    it.each([
      { category: 'Clothes', subheaders: 3 },
      { category: 'Gadgets', subheaders: 1 },
    ])(
      'shows the "$category" subheader once per group that holds its units ($subheaders)',
      ({ category, subheaders }) => {
        renderTable(storageChecklist, undefined, undefined, 'storage');

        expect(screen.getAllByText(category)).toHaveLength(subheaders);
      },
    );

    it('keeps the per-occasion progress identical to the category view', () => {
      renderTable(
        storageChecklist,
        (occId, id) => occId === 1 && id === 10,
        undefined,
        'storage',
      );

      // Jacket is listed twice but counted once: 1 of 3 units.
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });
  });
});
