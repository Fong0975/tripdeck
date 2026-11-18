import type { LocationLabel } from '@tripdeck/shared';
import { describe, expect, it } from 'vitest';

import { DEFAULT_LABELS } from '@/components/Checklist/locations/locationLabelSet';
import {
  makeChecklistCategory,
  makeChecklistItem,
  makeChecklistSpec,
} from '@/test-utils/fixtures';
import type { ChecklistCategory } from '@/types';

import {
  groupByStorage,
  splitByCategory,
  type StorageGroupKey,
} from './groupByStorage';

/** Summarizes groups as `key -> unit labels` for compact assertions. */
function summarize(categories: ChecklistCategory[]) {
  return groupByStorage(categories, DEFAULT_LABELS).map(group => ({
    key: group.key,
    labels: group.units.map(unit =>
      unit.kind === 'item'
        ? unit.item.name
        : `${unit.item.name} > ${unit.spec.name}`,
    ),
    locations: [...new Set(group.units.map(unit => unit.location))],
  }));
}

describe('groupByStorage', () => {
  const tests: {
    description: string;
    categories: ChecklistCategory[];
    expected: {
      key: StorageGroupKey;
      labels: string[];
      locations?: string[];
    }[];
  }[] = [
    {
      description: 'returns no groups for an empty checklist',
      categories: [],
      expected: [],
    },
    {
      description: 'files items by their own location and omits empty groups',
      categories: [
        makeChecklistCategory({
          items: [
            makeChecklistItem({ id: 1, name: 'A', storage_location: '隨身' }),
            makeChecklistItem({ id: 2, name: 'B', storage_location: '託運' }),
          ],
        }),
      ],
      expected: [
        { key: '託運', labels: ['B'] },
        { key: '隨身', labels: ['A'] },
      ],
    },
    {
      description: 'puts items without a location in the none group last',
      categories: [
        makeChecklistCategory({
          items: [
            makeChecklistItem({ id: 1, name: 'A', storage_location: null }),
            makeChecklistItem({ id: 2, name: 'B', storage_location: '託運' }),
          ],
        }),
      ],
      expected: [
        { key: '託運', labels: ['B'] },
        { key: '', labels: ['A'] },
      ],
    },
    {
      description: 'lists a multi-location item in each matching group',
      categories: [
        makeChecklistCategory({
          items: [
            makeChecklistItem({
              id: 1,
              name: 'A',
              storage_location: '託運,隨身',
            }),
          ],
        }),
      ],
      expected: [
        { key: '託運', labels: ['A'], locations: ['託運'] },
        { key: '隨身', labels: ['A'], locations: ['隨身'] },
      ],
    },
    {
      description:
        'lists a multi-location item once per group, in canonical location order',
      categories: [
        makeChecklistCategory({
          items: [
            makeChecklistItem({
              id: 1,
              name: 'A',
              storage_location: '隨身, 託運',
            }),
          ],
        }),
      ],
      expected: [
        { key: '託運', labels: ['A'] },
        { key: '隨身', labels: ['A'] },
      ],
    },
    {
      description: 'splits a spec with two own locations into both groups',
      categories: [
        makeChecklistCategory({
          items: [
            makeChecklistItem({
              id: 1,
              name: 'A',
              specs: [
                makeChecklistSpec({
                  id: 10,
                  name: 'S1',
                  storage_location: '託運,隨身',
                }),
              ],
            }),
          ],
        }),
      ],
      expected: [
        { key: '託運', labels: ['A > S1'], locations: ['託運'] },
        { key: '隨身', labels: ['A > S1'], locations: ['隨身'] },
      ],
    },
    {
      description:
        'ignores the location of an item with specs and files a spec without location in none',
      categories: [
        makeChecklistCategory({
          items: [
            makeChecklistItem({
              id: 1,
              name: 'A',
              storage_location: '託運,隨身',
              specs: [makeChecklistSpec({ id: 10, name: 'S1' })],
            }),
          ],
        }),
      ],
      expected: [{ key: '', labels: ['A > S1'], locations: [''] }],
    },
    {
      description:
        'splits a spec with two own locations while the stale item location is ignored',
      categories: [
        makeChecklistCategory({
          items: [
            makeChecklistItem({
              id: 1,
              name: 'A',
              storage_location: '託運',
              specs: [
                makeChecklistSpec({
                  id: 10,
                  name: 'S1',
                  storage_location: '託運,隨身',
                }),
                makeChecklistSpec({
                  id: 11,
                  name: 'S2',
                  storage_location: '隨身',
                }),
              ],
            }),
          ],
        }),
      ],
      expected: [
        { key: '託運', labels: ['A > S1'] },
        { key: '隨身', labels: ['A > S1', 'A > S2'] },
      ],
    },
    {
      description:
        'files names that are not default labels and specs without any in none',
      categories: [
        makeChecklistCategory({
          items: [
            makeChecklistItem({ id: 1, name: 'A', storage_location: '後背包' }),
            makeChecklistItem({
              id: 2,
              name: 'B',
              specs: [makeChecklistSpec({ id: 20, name: 'S1' })],
            }),
          ],
        }),
      ],
      expected: [
        { key: '', labels: ['A', 'B > S1'], locations: ['後背包', ''] },
      ],
    },
    {
      description:
        'splits an item with specs into spec units without inheriting the item location',
      categories: [
        makeChecklistCategory({
          items: [
            makeChecklistItem({
              id: 1,
              name: 'A',
              storage_location: '託運',
              specs: [
                makeChecklistSpec({
                  id: 10,
                  name: 'S1',
                  storage_location: '隨身',
                }),
                makeChecklistSpec({
                  id: 11,
                  name: 'S2',
                  storage_location: null,
                }),
              ],
            }),
          ],
        }),
      ],
      expected: [
        { key: '隨身', labels: ['A > S1'] },
        { key: '', labels: ['A > S2'] },
      ],
    },
    {
      description: 'keeps category then item order within a group',
      categories: [
        makeChecklistCategory({
          id: 1,
          items: [
            makeChecklistItem({ id: 1, name: 'A', storage_location: '隨身' }),
            makeChecklistItem({ id: 2, name: 'B', storage_location: '隨身' }),
          ],
        }),
        makeChecklistCategory({
          id: 2,
          items: [
            makeChecklistItem({ id: 3, name: 'C', storage_location: '隨身' }),
          ],
        }),
      ],
      expected: [{ key: '隨身', labels: ['A', 'B', 'C'] }],
    },
  ];

  it.each(tests)('$description', ({ categories, expected }) => {
    expect(summarize(categories)).toMatchObject(expected);
  });

  it('gives every unit of a multi-location item its own location and the same item', () => {
    const item = makeChecklistItem({ id: 1, storage_location: '託運,隨身' });

    const groups = groupByStorage(
      [makeChecklistCategory({ items: [item] })],
      DEFAULT_LABELS,
    );

    expect(
      groups.map(group => ({
        key: group.key,
        units: group.units.map(unit => ({
          kind: unit.kind,
          location: unit.location,
          sameItem: unit.item === item,
        })),
      })),
    ).toEqual([
      {
        key: '託運',
        units: [{ kind: 'item', location: '託運', sameItem: true }],
      },
      {
        key: '隨身',
        units: [{ kind: 'item', location: '隨身', sameItem: true }],
      },
    ]);
  });

  it('records the category and spec on each unit', () => {
    const groups = groupByStorage(
      [
        makeChecklistCategory({
          id: 7,
          name: 'Clothes',
          items: [
            makeChecklistItem({
              id: 1,
              specs: [
                makeChecklistSpec({
                  id: 10,
                  name: 'S1',
                  storage_location: '隨身',
                }),
              ],
            }),
          ],
        }),
      ],
      DEFAULT_LABELS,
    );

    expect(groups[0].units[0]).toMatchObject({
      kind: 'spec',
      categoryId: 7,
      categoryName: 'Clothes',
      spec: { id: 10 },
    });
  });
});

describe('groupByStorage with user-defined labels', () => {
  const label = (
    name: string,
    show_as_group: boolean,
    sort_order: number,
  ): LocationLabel => ({ id: sort_order + 1, name, show_as_group, sort_order });

  const categories = [
    makeChecklistCategory({
      items: [
        makeChecklistItem({ id: 1, name: 'A', storage_location: '手提' }),
        makeChecklistItem({ id: 2, name: 'B', storage_location: '託運' }),
        makeChecklistItem({ id: 3, name: 'C', storage_location: '背包' }),
        makeChecklistItem({ id: 4, name: 'D', storage_location: '隨身' }),
        makeChecklistItem({ id: 5, name: 'E', storage_location: null }),
      ],
    }),
  ];

  const tests: {
    description: string;
    labels: LocationLabel[];
    expected: { key: string; labels: string[] }[];
  }[] = [
    {
      description: 'orders the groups by label order',
      labels: [
        label('手提', true, 0),
        label('隨身', true, 1),
        label('託運', true, 2),
      ],
      expected: [
        { key: '手提', labels: ['A'] },
        { key: '隨身', labels: ['D'] },
        { key: '託運', labels: ['B'] },
        { key: '', labels: ['C', 'E'] },
      ],
    },
    {
      description:
        'merges labels that are not their own group, and deleted names, into the none group',
      labels: [
        label('手提', false, 0),
        label('託運', true, 1),
        label('隨身', false, 2),
      ],
      expected: [
        { key: '託運', labels: ['B'] },
        { key: '', labels: ['A', 'C', 'D', 'E'] },
      ],
    },
    {
      description: 'puts everything in the none group without labels',
      labels: [],
      expected: [{ key: '', labels: ['A', 'B', 'C', 'D', 'E'] }],
    },
  ];

  it.each(tests)('$description', ({ labels, expected }) => {
    const groups = groupByStorage(categories, labels).map(group => ({
      key: group.key,
      labels: group.units.map(unit => unit.item.name),
    }));

    expect(groups).toEqual(expected);
  });
});

describe('splitByCategory', () => {
  const tests: {
    description: string;
    categories: ChecklistCategory[];
    expected: { categoryName: string; count: number }[];
  }[] = [
    {
      description: 'returns no sections for no units',
      categories: [],
      expected: [],
    },
    {
      description: 'merges consecutive units of one category',
      categories: [
        makeChecklistCategory({
          id: 1,
          name: 'A',
          items: [
            makeChecklistItem({ id: 1, storage_location: '隨身' }),
            makeChecklistItem({ id: 2, storage_location: '隨身' }),
          ],
        }),
      ],
      expected: [{ categoryName: 'A', count: 2 }],
    },
    {
      description:
        'starts a new section per category and keeps same-named ones apart',
      categories: [
        makeChecklistCategory({
          id: 1,
          name: 'Same',
          items: [makeChecklistItem({ id: 1, storage_location: '隨身' })],
        }),
        makeChecklistCategory({
          id: 2,
          name: 'Same',
          items: [makeChecklistItem({ id: 2, storage_location: '隨身' })],
        }),
      ],
      expected: [
        { categoryName: 'Same', count: 1 },
        { categoryName: 'Same', count: 1 },
      ],
    },
  ];

  it.each(tests)('$description', ({ categories, expected }) => {
    const units = groupByStorage(categories, DEFAULT_LABELS).flatMap(
      group => group.units,
    );

    expect(
      splitByCategory(units).map(section => ({
        categoryName: section.categoryName,
        count: section.units.length,
      })),
    ).toEqual(expected);
  });
});
