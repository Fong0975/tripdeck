import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LocationLabel } from '@tripdeck/shared';
import { describe, expect, it, vi } from 'vitest';

import { LocationLabelsContext } from '@/components/Checklist/locations/LocationLabelsContext';
import { buildLabelSet } from '@/components/Checklist/locations/locationLabelSet';
import {
  makeChecklistCategory,
  makeChecklistItem,
  makeChecklistSpec,
  makeTripChecklist,
} from '@/test-utils/fixtures';
import type { TripChecklist } from '@/types';

import ChecklistStorageBody from './ChecklistStorageBody';
import type { CheckGetter } from './checkUnits';
import { unitKey } from './incompleteFilter';

const occasions = [
  { id: 1, name: 'Occ A', checks: {}, specChecks: {} },
  { id: 2, name: 'Occ B', checks: {}, specChecks: {} },
];

function makeChecklist(): TripChecklist {
  return makeTripChecklist({
    occasions,
    categories: [
      makeChecklistCategory({
        id: 1,
        name: 'Clothes',
        items: [
          makeChecklistItem({
            id: 10,
            name: 'Jacket',
            storage_location: '託運,隨身',
          }),
          makeChecklistItem({ id: 11, name: 'Socks', storage_location: null }),
        ],
      }),
      makeChecklistCategory({
        id: 2,
        name: 'Gadgets',
        items: [
          makeChecklistItem({
            id: 20,
            name: 'Charger',
            storage_location: null,
            specs: [
              makeChecklistSpec({
                id: 201,
                name: 'USB-C',
                storage_location: '隨身',
              }),
              makeChecklistSpec({
                id: 202,
                name: 'Lightning',
                storage_location: '託運',
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function renderBody({
  checklist = makeChecklist(),
  getCheck = () => false,
  getSpecCheck = () => false,
}: {
  checklist?: TripChecklist;
  getCheck?: CheckGetter;
  getSpecCheck?: CheckGetter;
} = {}) {
  const onToggleCheck = vi.fn();
  const onToggleSpecCheck = vi.fn();
  render(
    <table>
      <ChecklistStorageBody
        checklist={checklist}
        getCheck={getCheck}
        getSpecCheck={getSpecCheck}
        onToggleCheck={onToggleCheck}
        onToggleSpecCheck={onToggleSpecCheck}
      />
    </table>,
  );
  return { onToggleCheck, onToggleSpecCheck };
}

/** The `<tr>` elements between a group header and the next group header. */
function rowsOfGroup(label: string): HTMLElement[] {
  const rows = screen.getAllByRole('row');
  const start = rows.findIndex(row => within(row).queryByText(label));
  const rest = rows.slice(start + 1);
  const end = rest.findIndex(row => within(row).queryByText(/ 項$/));
  return end === -1 ? rest : rest.slice(0, end);
}

describe('ChecklistStorageBody', () => {
  it('lists the groups in storage order with their unit counts', () => {
    renderBody();

    const headers = screen
      .getAllByText(/ 項$/)
      .map(count => count.parentElement?.textContent);
    expect(headers).toEqual(['託運2 項', '隨身2 項', '未指定存放位置1 項']);
  });

  it('shows a category subheader per category inside a group', () => {
    renderBody();

    expect(screen.getAllByText('Clothes')).toHaveLength(3);
    expect(screen.getAllByText('Gadgets')).toHaveLength(2);
  });

  it('files an item under every location it has, once per group', () => {
    renderBody();

    expect(
      within(screen.getByRole('table')).getAllByText('Jacket'),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole('checkbox', { name: 'Jacket - Occ A' }),
    ).toHaveLength(2);
  });

  it('puts units without a location under "未指定存放位置"', () => {
    renderBody();

    expect(screen.getByText('未指定存放位置')).toBeInTheDocument();
    const noneRows = rowsOfGroup('未指定存放位置');
    expect(
      within(noneRows[noneRows.length - 1]).getByText('Socks'),
    ).toBeInTheDocument();
  });

  it('reads each group row with the location of its group', () => {
    const getCheck = vi.fn<CheckGetter>(() => false);
    renderBody({ getCheck });

    const jacketLocations = getCheck.mock.calls
      .filter(([, itemId]) => itemId === 10)
      .map(([, , location]) => location);
    expect([...new Set(jacketLocations)].sort()).toEqual(['託運', '隨身']);
    const socksLocations = getCheck.mock.calls
      .filter(([, itemId]) => itemId === 11)
      .map(([, , location]) => location);
    expect([...new Set(socksLocations)]).toEqual(['']);
  });

  it.each([
    { group: '託運', location: '託運' },
    { group: '隨身', location: '隨身' },
  ])(
    'checks Jacket only in the $group group when only that location is checked',
    ({ group, location }) => {
      renderBody({
        getCheck: (occId, itemId, checkedLocation) =>
          occId === 1 && itemId === 10 && checkedLocation === location,
      });

      const checkedJackets = screen
        .getAllByRole('checkbox', { name: 'Jacket - Occ A' })
        .filter(box => (box as HTMLInputElement).checked);
      expect(checkedJackets).toHaveLength(1);
      // eslint-disable-next-line testing-library/no-node-access
      const row = checkedJackets[0].closest('tr') as HTMLElement;
      expect(rowsOfGroup(group)).toContain(row);
    },
  );

  it.each([
    { group: '託運', location: '託運' },
    { group: '隨身', location: '隨身' },
  ])(
    'toggles Jacket at $location when its checkbox in the $group group is clicked',
    async ({ group, location }) => {
      const user = userEvent.setup();
      const { onToggleCheck } = renderBody();

      const jacketRow = rowsOfGroup(group).find(row =>
        within(row).queryByText('Jacket'),
      ) as HTMLElement;
      await user.click(
        within(jacketRow).getByRole('checkbox', { name: 'Jacket - Occ B' }),
      );

      expect(onToggleCheck).toHaveBeenCalledTimes(1);
      expect(onToggleCheck).toHaveBeenCalledWith(2, 10, location);
    },
  );

  it('files specs by their own location', async () => {
    const user = userEvent.setup();
    const { onToggleSpecCheck } = renderBody();

    await user.click(
      within(
        rowsOfGroup('隨身').find(row =>
          within(row).queryByText('USB-C'),
        ) as HTMLElement,
      ).getByRole('checkbox', { name: 'USB-C - Occ A' }),
    );
    await user.click(
      within(
        rowsOfGroup('託運').find(row =>
          within(row).queryByText('Lightning'),
        ) as HTMLElement,
      ).getByRole('checkbox', { name: 'Lightning - Occ A' }),
    );

    expect(onToggleSpecCheck).toHaveBeenNthCalledWith(1, 1, 201, '隨身');
    expect(onToggleSpecCheck).toHaveBeenNthCalledWith(2, 1, 202, '託運');
  });
});

describe('ChecklistStorageBody with user-defined labels', () => {
  const labels: LocationLabel[] = [
    { id: 1, name: '手提', show_as_group: true, sort_order: 0 },
    { id: 2, name: '託運', show_as_group: false, sort_order: 1 },
  ];

  function renderWithLabels() {
    const checklist = makeTripChecklist({
      occasions,
      categories: [
        makeChecklistCategory({
          id: 1,
          name: 'Clothes',
          items: [
            makeChecklistItem({
              id: 10,
              name: 'Jacket',
              storage_location: '手提',
            }),
            makeChecklistItem({
              id: 11,
              name: 'Shoes',
              storage_location: '託運',
            }),
            makeChecklistItem({
              id: 12,
              name: 'Scarf',
              storage_location: '背包',
            }),
          ],
        }),
      ],
    });
    render(
      <LocationLabelsContext.Provider
        value={buildLabelSet(labels, async () => {})}
      >
        <table>
          <ChecklistStorageBody
            checklist={checklist}
            getCheck={() => false}
            getSpecCheck={() => false}
            onToggleCheck={vi.fn()}
            onToggleSpecCheck={vi.fn()}
          />
        </table>
      </LocationLabelsContext.Provider>,
    );
  }

  it('lists only the labels that are their own group, by label name', () => {
    renderWithLabels();

    const headers = screen
      .getAllByText(/ 項$/)
      .map(count => count.parentElement?.textContent);
    expect(headers).toEqual(['手提1 項', '未指定存放位置2 項']);
  });

  it('shows the location of units in the "未指定存放位置" group, and not in a named group', () => {
    renderWithLabels();

    const noneRows = rowsOfGroup('未指定存放位置');
    expect(within(noneRows[1]).getByText('託運')).toBeInTheDocument();
    expect(within(noneRows[2]).getByText('背包')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Shoes（託運） - Occ A' }),
    ).toBeInTheDocument();

    const named = rowsOfGroup('手提');
    expect(within(named[1]).queryByText('手提')).not.toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Jacket - Occ A' }),
    ).toBeInTheDocument();
  });
});

describe('ChecklistStorageBody filter', () => {
  function renderFiltered(hidden: string[]) {
    render(
      <table>
        <ChecklistStorageBody
          checklist={makeChecklist()}
          hidden={new Set(hidden)}
          getCheck={() => false}
          getSpecCheck={() => false}
          onToggleCheck={vi.fn()}
          onToggleSpecCheck={vi.fn()}
        />
      </table>,
    );
  }

  it.each([
    {
      name: 'hides an item only in the given group',
      hidden: ['10|託運'],
      headers: ['託運1 項', '隨身2 項', '未指定存放位置1 項'],
    },
    {
      name: 'drops a group whose items are all hidden',
      hidden: ['11|', '20|', '10|隨身'],
      headers: ['託運2 項', '隨身1 項'],
    },
    {
      name: 'ignores keys that match no group',
      hidden: ['10|手提', '99|託運'],
      headers: ['託運2 項', '隨身2 項', '未指定存放位置1 項'],
    },
  ])('$name', ({ hidden, headers }) => {
    renderFiltered(hidden);

    expect(
      screen
        .getAllByText(/ 項$/)
        .map(count => count.parentElement?.textContent),
    ).toEqual(headers);
  });
});

describe('ChecklistStorageBody unit visibility', () => {
  it('lists only the visible units and drops empty groups', () => {
    const visible = new Set(['spec-201|隨身', 'item-11|']);
    render(
      <table>
        <ChecklistStorageBody
          checklist={makeChecklist()}
          isUnitVisible={unit => visible.has(unitKey(unit))}
          getCheck={() => false}
          getSpecCheck={() => false}
          onToggleCheck={vi.fn()}
          onToggleSpecCheck={vi.fn()}
        />
      </table>,
    );

    expect(
      screen
        .getAllByText(/ 項$/)
        .map(count => count.parentElement?.textContent),
    ).toEqual(['隨身1 項', '未指定存放位置1 項']);
  });
});
