import { fireEvent, render, screen } from '@testing-library/react';
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

type Getter = (occId: number, id: number, location: string) => boolean;

function renderTable(
  checklist: TripChecklist,
  getCheck: Getter = () => false,
  getSpecCheck: Getter = () => false,
  viewMode?: ViewMode,
) {
  const onToggleCheck = vi.fn();
  const onToggleSpecCheck = vi.fn();
  render(
    <ChecklistTable
      checklist={checklist}
      getCheck={getCheck}
      getSpecCheck={getSpecCheck}
      onToggleCheck={onToggleCheck}
      onToggleSpecCheck={onToggleSpecCheck}
      viewMode={viewMode}
    />,
  );
  return { onToggleCheck, onToggleSpecCheck };
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
      { header: '未指定存放位置', count: '1 項' },
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

    it('counts a multi-location item once per location, like the category view', () => {
      renderTable(
        storageChecklist,
        (occId, id, location) =>
          occId === 1 && id === 10 && location === '託運',
        undefined,
        'storage',
      );

      // Jacket (2 locations) + Socks + USB-C = 4 units, 1 of them checked.
      expect(screen.getByText('1 / 4')).toBeInTheDocument();
    });
  });

  describe('per-location checks', () => {
    const jacketChecklist = makeChecklist({
      categories: [
        makeChecklistCategory({
          items: [
            makeChecklistItem({
              id: 10,
              name: 'Jacket',
              storage_location: '託運,隨身',
            }),
          ],
        }),
      ],
    });
    const checkedAtCheckedBaggage: Getter = (occId, id, location) =>
      occId === 1 && id === 10 && location === '託運';

    it('shows a multi-location item once with one independently checked sub-row per location in the category view', () => {
      const { onToggleCheck } = renderTable(
        jacketChecklist,
        checkedAtCheckedBaggage,
      );

      expect(screen.getAllByText('Jacket')).toHaveLength(1);
      expect(screen.getByLabelText('Jacket（託運） - Occ A')).toBeChecked();
      expect(screen.getByLabelText('Jacket（隨身） - Occ A')).not.toBeChecked();

      fireEvent.click(screen.getByLabelText('Jacket（隨身） - Occ B'));

      expect(onToggleCheck).toHaveBeenCalledTimes(1);
      expect(onToggleCheck).toHaveBeenCalledWith(2, 10, '隨身');
    });

    it.each([
      {
        name: 'none of the locations is checked',
        checkedLocations: [],
        occA: 'unchecked',
        occB: 'unchecked',
      },
      {
        name: 'one of the locations is checked',
        checkedLocations: ['託運'],
        occA: 'partial',
        occB: 'unchecked',
      },
      {
        name: 'every location is checked',
        checkedLocations: ['託運', '隨身'],
        occA: 'checked',
        occB: 'unchecked',
      },
    ])(
      'derives the read-only name row state of a multi-location item when $name',
      ({ checkedLocations, occA, occB }) => {
        const { onToggleCheck } = renderTable(
          jacketChecklist,
          (occId, id, location) =>
            occId === 1 && id === 10 && checkedLocations.includes(location),
        );

        const states = {
          checked: (box: HTMLElement) => expect(box).toBeChecked(),
          partial: (box: HTMLElement) => expect(box).toBePartiallyChecked(),
          unchecked: (box: HTMLElement) => expect(box).not.toBeChecked(),
        };
        const nameRowA = screen.getByLabelText('Jacket - Occ A');
        const nameRowB = screen.getByLabelText('Jacket - Occ B');
        states[occA as keyof typeof states](nameRowA);
        states[occB as keyof typeof states](nameRowB);
        expect(nameRowA).toBeDisabled();

        fireEvent.click(nameRowA);

        expect(onToggleCheck).not.toHaveBeenCalled();
      },
    );

    it('checks the two groups of a multi-location item independently in the storage view', () => {
      const { onToggleCheck } = renderTable(
        jacketChecklist,
        checkedAtCheckedBaggage,
        undefined,
        'storage',
      );

      // Groups are ordered 託運 then 隨身, one Jacket row each, Occ A column.
      const [inCheckedBaggage, inCarryOn] = screen
        .getAllByLabelText('Jacket - Occ A')
        .map(box => box as HTMLInputElement);
      expect(inCheckedBaggage).toBeChecked();
      expect(inCarryOn).not.toBeChecked();

      fireEvent.click(inCarryOn);

      expect(onToggleCheck).toHaveBeenCalledTimes(1);
      expect(onToggleCheck).toHaveBeenCalledWith(1, 10, '隨身');
    });

    it.each([
      {
        name: 'item without location',
        storage_location: null,
        labels: ['Jacket - Occ A'],
      },
      {
        name: 'item with one location',
        storage_location: '隨身',
        labels: ['Jacket（隨身） - Occ A'],
      },
      {
        name: 'item with both locations (name row plus one sub-row each)',
        storage_location: '託運,隨身',
        labels: [
          'Jacket - Occ A',
          'Jacket（託運） - Occ A',
          'Jacket（隨身） - Occ A',
        ],
      },
    ])(
      'labels the category view check cells of an $name',
      ({ storage_location, labels }) => {
        renderTable(
          makeChecklist({
            categories: [
              makeChecklistCategory({
                items: [
                  makeChecklistItem({
                    id: 10,
                    name: 'Jacket',
                    storage_location,
                  }),
                ],
              }),
            ],
          }),
        );

        for (const label of labels) {
          expect(screen.getByLabelText(label)).toBeInTheDocument();
        }
        expect(screen.getAllByLabelText(/^Jacket.* - Occ A$/)).toHaveLength(
          labels.length,
        );
      },
    );

    it('keeps a single-location item as one checkable row without sub-rows', () => {
      const { onToggleCheck } = renderTable(
        makeChecklist({
          categories: [
            makeChecklistCategory({
              items: [
                makeChecklistItem({
                  id: 10,
                  name: 'Jacket',
                  storage_location: '隨身',
                }),
              ],
            }),
          ],
        }),
      );

      const cell = screen.getByLabelText('Jacket（隨身） - Occ A');
      expect(cell).toBeEnabled();

      fireEvent.click(cell);

      expect(onToggleCheck).toHaveBeenCalledWith(1, 10, '隨身');
    });

    describe('specs', () => {
      const chargerChecklist = (specLocation: string | null) =>
        makeChecklist({
          categories: [
            makeChecklistCategory({
              items: [
                makeChecklistItem({
                  id: 30,
                  name: 'Charger',
                  storage_location: '託運,隨身',
                  specs: [
                    makeChecklistSpec({
                      id: 301,
                      name: 'USB-C',
                      storage_location: specLocation,
                    }),
                  ],
                }),
              ],
            }),
          ],
        });
      const checkedAtCarryOn: Getter = (occId, id, location) =>
        occId === 1 && id === 301 && location === '隨身';

      it('shows a spec with two locations as a read-only name row with one sub-row per location', () => {
        const { onToggleSpecCheck } = renderTable(
          chargerChecklist('託運,隨身'),
          undefined,
          checkedAtCarryOn,
        );

        // The item row and the spec name row both derive their state.
        expect(screen.getByLabelText('Charger - Occ A')).toBeDisabled();
        expect(screen.getByLabelText('Charger - Occ A')).toBePartiallyChecked();
        expect(screen.getByLabelText('USB-C - Occ A')).toBeDisabled();
        expect(screen.getByLabelText('USB-C - Occ A')).toBePartiallyChecked();
        expect(screen.getAllByText('USB-C')).toHaveLength(1);
        expect(
          screen.getByLabelText('USB-C（託運） - Occ A'),
        ).not.toBeChecked();
        expect(screen.getByLabelText('USB-C（隨身） - Occ A')).toBeChecked();

        fireEvent.click(screen.getByLabelText('USB-C（託運） - Occ B'));

        expect(onToggleSpecCheck).toHaveBeenCalledTimes(1);
        expect(onToggleSpecCheck).toHaveBeenCalledWith(2, 301, '託運');
      });

      it('shows a spec with several own locations as a name row with sub-rows, ignoring the item locations', () => {
        renderTable(
          chargerChecklist('隨身,託運'),
          undefined,
          (occId, id) => occId === 1 && id === 301,
        );

        expect(screen.getByLabelText('USB-C - Occ A')).toBeChecked();
        expect(screen.getByLabelText('USB-C（託運） - Occ A')).toBeChecked();
        expect(screen.getByLabelText('USB-C（隨身） - Occ A')).toBeChecked();
      });

      it('ignores the stale location of the item: a spec without location is a single checkable row', () => {
        const { onToggleSpecCheck } = renderTable(chargerChecklist(null));

        const cell = screen.getByLabelText('USB-C - Occ A');
        expect(cell).toBeEnabled();
        expect(
          screen.queryByLabelText('USB-C（託運） - Occ A'),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByLabelText('USB-C（隨身） - Occ A'),
        ).not.toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('USB-C - Occ B'));

        expect(onToggleSpecCheck).toHaveBeenCalledWith(2, 301, '');
      });

      it('keeps a spec with one own location as a single checkable row', () => {
        const { onToggleSpecCheck } = renderTable(
          chargerChecklist('隨身'),
          undefined,
          checkedAtCarryOn,
        );

        const cell = screen.getByLabelText('USB-C（隨身） - Occ A');
        expect(cell).toBeEnabled();
        expect(cell).toBeChecked();
        expect(
          screen.queryByLabelText('USB-C - Occ A'),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByLabelText('USB-C（託運） - Occ A'),
        ).not.toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('USB-C（隨身） - Occ B'));

        expect(onToggleSpecCheck).toHaveBeenCalledWith(2, 301, '隨身');
      });
    });
  });
});
