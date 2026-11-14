import { describe, expect, it, vi } from 'vitest';

import { makeChecklistItem, makeChecklistSpec } from '@/test-utils/fixtures';
import type { ChecklistItem } from '@/types';

import {
  createItemSpecTrackers,
  type ItemSpecApi,
  makeItemSpecSync,
} from './itemSpecSync';
import type { EditItem } from './types';

function makeApi() {
  const createdItem = makeChecklistItem({
    id: 900,
    name: 'Created',
    specs: [],
  });
  const createdSpec = makeChecklistSpec({ id: 950, name: 'Created spec' });
  return {
    addItem: vi.fn<ItemSpecApi['addItem']>(async () => createdItem),
    updateItem: vi.fn<ItemSpecApi['updateItem']>(async () => undefined),
    removeItem: vi.fn<ItemSpecApi['removeItem']>(async () => undefined),
    addSpec: vi.fn<ItemSpecApi['addSpec']>(async () => createdSpec),
    updateSpec: vi.fn<ItemSpecApi['updateSpec']>(async () => undefined),
    removeSpec: vi.fn<ItemSpecApi['removeSpec']>(async () => undefined),
  };
}

type Api = ReturnType<typeof makeApi>;

const originals: ChecklistItem[] = [
  makeChecklistItem({
    id: 10,
    name: 'Item A',
    quantity: 1,
    notes: null,
    storage_location: null,
    specs: [makeChecklistSpec({ id: 100, name: 'Spec A' })],
  }),
];

function unchanged(): EditItem[] {
  return [
    {
      id: 10,
      name: 'Item A',
      quantity: 1,
      notes: null,
      storage_location: null,
      specs: [{ id: 100, name: 'Spec A', storage_location: null }],
    },
  ];
}

describe('makeItemSpecSync', () => {
  it.each<{
    description: string;
    edited: () => EditItem[];
    verify: (api: Api) => void;
  }>([
    {
      description: 'issues no calls when nothing changed',
      edited: unchanged,
      verify: api => {
        Object.values(api).forEach(fn => expect(fn).not.toHaveBeenCalled());
      },
    },
    {
      description: 'updates a changed item, falling back to its original name',
      edited: () => {
        const items = unchanged();
        items[0] = { ...items[0], name: '  ', quantity: 5 };
        return items;
      },
      verify: api => {
        expect(api.updateItem).toHaveBeenCalledWith(10, {
          name: 'Item A',
          quantity: 5,
          notes: null,
          storage_location: null,
        });
      },
    },
    {
      description: 'removes an item flagged as deleted',
      edited: () => [{ ...unchanged()[0], _deleted: true }],
      verify: api => {
        expect(api.removeItem).toHaveBeenCalledWith(10);
        expect(api.removeSpec).not.toHaveBeenCalled();
      },
    },
    {
      description: 'adds a new item with its specs under the created id',
      edited: () => [
        ...unchanged(),
        {
          id: -1,
          name: '',
          quantity: null,
          notes: null,
          storage_location: null,
          specs: [{ id: -2, name: '', storage_location: '託運' }],
        },
      ],
      verify: api => {
        expect(api.addItem).toHaveBeenCalledWith({
          name: '新項目',
          quantity: null,
          notes: null,
          storage_location: null,
        });
        expect(api.addSpec).toHaveBeenCalledWith(900, {
          name: '新規格',
          storage_location: '託運',
        });
      },
    },
    {
      description: 'updates, adds and removes specs of a kept item',
      edited: () => {
        const items = unchanged();
        items[0] = {
          ...items[0],
          specs: [{ id: -3, name: 'New spec', storage_location: null }],
        };
        return items;
      },
      verify: api => {
        expect(api.removeSpec).toHaveBeenCalledWith(10, 100);
        expect(api.addSpec).toHaveBeenCalledWith(10, {
          name: 'New spec',
          storage_location: null,
        });
      },
    },
    {
      description: 'updates a changed spec, falling back to its original name',
      edited: () => {
        const items = unchanged();
        items[0] = {
          ...items[0],
          specs: [{ id: 100, name: '', storage_location: '隨身' }],
        };
        return items;
      },
      verify: api => {
        expect(api.updateSpec).toHaveBeenCalledWith(10, 100, {
          name: 'Spec A',
          storage_location: '隨身',
        });
      },
    },
  ])('$description', async ({ edited, verify }) => {
    const api = makeApi();

    await makeItemSpecSync(api, createItemSpecTrackers())(originals, edited());

    verify(api);
  });

  it('skips already-done creates and deletes on retry', async () => {
    const api = makeApi();
    api.addSpec.mockRejectedValueOnce(new Error('network'));
    const trackers = createItemSpecTrackers();
    const edited: EditItem[] = [
      { ...unchanged()[0], _deleted: true },
      {
        id: -10,
        name: 'New',
        quantity: null,
        notes: null,
        storage_location: null,
        specs: [{ id: -11, name: 'S', storage_location: null }],
      },
    ];
    const sync = makeItemSpecSync(api, trackers);

    await expect(sync(originals, edited)).rejects.toThrow('network');
    await sync(originals, edited);

    expect(api.removeItem).toHaveBeenCalledTimes(1);
    expect(api.addItem).toHaveBeenCalledTimes(1);
    expect(api.addSpec).toHaveBeenCalledTimes(2);
    expect(api.addSpec).toHaveBeenLastCalledWith(900, {
      name: 'S',
      storage_location: null,
    });
  });
});
