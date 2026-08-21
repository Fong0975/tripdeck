import { describe, expect, it, vi } from 'vitest';

import {
  type DiffSyncHandlers,
  type EditableEntity,
  itemFieldsChanged,
  itemPayload,
  specFieldsChanged,
  specPayload,
  syncEditableList,
} from './checklistDiffSync';
import type { EditItem, EditSpec } from './types';

function makeEditItem(overrides: Partial<EditItem> = {}): EditItem {
  return {
    id: 1,
    name: 'Item',
    quantity: null,
    notes: null,
    storage_location: null,
    specs: [],
    ...overrides,
  };
}

function makeEditSpec(overrides: Partial<EditSpec> = {}): EditSpec {
  return {
    id: 1,
    name: 'Spec',
    storage_location: null,
    ...overrides,
  };
}

describe('itemFieldsChanged', () => {
  it.each([
    {
      description: 'identical fields',
      edited: makeEditItem({
        name: 'Item',
        quantity: 2,
        notes: 'note',
        storage_location: '託運',
      }),
      orig: {
        name: 'Item',
        quantity: 2,
        notes: 'note',
        storage_location: '託運',
      },
      expected: false,
    },
    {
      description: 'name whitespace is trimmed before comparing',
      edited: makeEditItem({ name: '  Item  ' }),
      orig: {
        name: 'Item',
        quantity: null,
        notes: null,
        storage_location: null,
      },
      expected: false,
    },
    {
      description: 'name changed',
      edited: makeEditItem({ name: 'Other' }),
      orig: {
        name: 'Item',
        quantity: null,
        notes: null,
        storage_location: null,
      },
      expected: true,
    },
    {
      description: 'quantity changed',
      edited: makeEditItem({ quantity: 2 }),
      orig: { name: 'Item', quantity: 1, notes: null, storage_location: null },
      expected: true,
    },
    {
      description: 'quantity undefined on orig is treated the same as null',
      edited: makeEditItem({ quantity: null }),
      orig: { name: 'Item', notes: null, storage_location: null },
      expected: false,
    },
    {
      description: 'notes changed',
      edited: makeEditItem({ notes: 'new note' }),
      orig: {
        name: 'Item',
        quantity: null,
        notes: null,
        storage_location: null,
      },
      expected: true,
    },
    {
      description: 'notes undefined on orig is treated the same as null',
      edited: makeEditItem({ notes: null }),
      orig: { name: 'Item', quantity: null, storage_location: null },
      expected: false,
    },
    {
      description: 'storage_location changed',
      edited: makeEditItem({ storage_location: '託運' }),
      orig: {
        name: 'Item',
        quantity: null,
        notes: null,
        storage_location: null,
      },
      expected: true,
    },
  ])('returns $expected when $description', ({ edited, orig, expected }) => {
    expect(itemFieldsChanged(edited, orig)).toBe(expected);
  });
});

describe('itemPayload', () => {
  it.each([
    {
      description: 'trims name and passes other fields through unchanged',
      edited: makeEditItem({
        name: '  Item  ',
        quantity: 2,
        notes: 'note',
        storage_location: '託運',
      }),
      fallbackName: '新項目',
      expected: {
        name: 'Item',
        quantity: 2,
        notes: 'note',
        storage_location: '託運',
      },
    },
    {
      description: 'blank name falls back to fallbackName',
      edited: makeEditItem({ name: '   ' }),
      fallbackName: '新項目',
      expected: {
        name: '新項目',
        quantity: null,
        notes: null,
        storage_location: null,
      },
    },
    {
      description: 'quantity 0 is preserved, not treated as missing',
      edited: makeEditItem({ name: 'Item', quantity: 0 }),
      fallbackName: '新項目',
      expected: {
        name: 'Item',
        quantity: 0,
        notes: null,
        storage_location: null,
      },
    },
  ])(
    'returns $expected for $description',
    ({ edited, fallbackName, expected }) => {
      expect(itemPayload(edited, fallbackName)).toEqual(expected);
    },
  );
});

describe('specFieldsChanged', () => {
  it.each([
    {
      description: 'identical fields',
      edited: makeEditSpec({ name: 'Spec', storage_location: '託運' }),
      orig: { name: 'Spec', storage_location: '託運' },
      expected: false,
    },
    {
      description: 'name whitespace is trimmed before comparing',
      edited: makeEditSpec({ name: ' Spec ' }),
      orig: { name: 'Spec', storage_location: null },
      expected: false,
    },
    {
      description: 'name changed',
      edited: makeEditSpec({ name: 'Other' }),
      orig: { name: 'Spec', storage_location: null },
      expected: true,
    },
    {
      description:
        'storage_location undefined on orig is treated the same as null',
      edited: makeEditSpec({ storage_location: null }),
      orig: { name: 'Spec' },
      expected: false,
    },
    {
      description: 'storage_location changed',
      edited: makeEditSpec({ storage_location: '隨身' }),
      orig: { name: 'Spec', storage_location: null },
      expected: true,
    },
  ])('returns $expected when $description', ({ edited, orig, expected }) => {
    expect(specFieldsChanged(edited, orig)).toBe(expected);
  });
});

describe('specPayload', () => {
  it.each([
    {
      description: 'trims name and passes storage_location through',
      edited: makeEditSpec({ name: '  Spec  ', storage_location: '託運' }),
      fallbackName: '新規格' as string | undefined,
      expected: { name: 'Spec', storage_location: '託運' },
    },
    {
      description: 'blank name falls back to fallbackName',
      edited: makeEditSpec({ name: '  ' }),
      fallbackName: '新規格' as string | undefined,
      expected: { name: '新規格', storage_location: null },
    },
    {
      description: 'default fallbackName is used when omitted',
      edited: makeEditSpec({ name: '' }),
      fallbackName: undefined as string | undefined,
      expected: { name: '新規格', storage_location: null },
    },
  ])(
    'returns $expected for $description',
    ({ edited, fallbackName, expected }) => {
      const payload =
        fallbackName === undefined
          ? specPayload(edited)
          : specPayload(edited, fallbackName);
      expect(payload).toEqual(expected);
    },
  );
});

describe('syncEditableList', () => {
  interface TestOrig {
    id: number;
    name: string;
  }
  type TestEdit = EditableEntity & { name: string };

  function makeHandlers(
    overrides: Partial<DiffSyncHandlers<TestOrig, TestEdit>> = {},
  ): DiffSyncHandlers<TestOrig, TestEdit> {
    return {
      add: vi.fn(async (edited: TestEdit) => ({ id: 100, name: edited.name })),
      update: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
      isChanged: vi.fn(() => false),
      ...overrides,
    };
  }

  it('calls remove for every original entry not present in the edited list', async () => {
    const originals: TestOrig[] = [
      { id: 1, name: 'Kept' },
      { id: 2, name: 'Removed' },
    ];
    const edited: TestEdit[] = [{ id: 1, name: 'Kept' }];
    const handlers = makeHandlers();

    await syncEditableList(originals, edited, handlers);

    expect(handlers.remove).toHaveBeenCalledTimes(1);
    expect(handlers.remove).toHaveBeenCalledWith(2);
  });

  it('does not call any API for a locally added-then-deleted entry', async () => {
    const edited: TestEdit[] = [{ id: -1, name: 'New', _deleted: true }];
    const handlers = makeHandlers();

    await syncEditableList([], edited, handlers);

    expect(handlers.add).not.toHaveBeenCalled();
    expect(handlers.update).not.toHaveBeenCalled();
    expect(handlers.remove).not.toHaveBeenCalled();
  });

  it('skips a kept entry whose original record cannot be found', async () => {
    const edited: TestEdit[] = [{ id: 5, name: 'Kept' }];
    const handlers = makeHandlers();

    await syncEditableList([], edited, handlers);

    expect(handlers.isChanged).not.toHaveBeenCalled();
    expect(handlers.update).not.toHaveBeenCalled();
  });

  it('still calls syncChildren for an entry whose own fields are unchanged', async () => {
    const orig: TestOrig = { id: 1, name: 'Same' };
    const edited: TestEdit[] = [{ id: 1, name: 'Same' }];
    const syncChildren = vi.fn(async () => undefined);
    const handlers = makeHandlers({
      isChanged: vi.fn(() => false),
      syncChildren,
    });

    await syncEditableList([orig], edited, handlers);

    expect(handlers.update).not.toHaveBeenCalled();
    expect(syncChildren).toHaveBeenCalledWith(edited[0], 1, orig);
  });

  it('does not crash when syncChildren is not provided', async () => {
    const orig: TestOrig = { id: 1, name: 'Same' };
    const edited: TestEdit[] = [{ id: 1, name: 'Changed' }];
    const handlers = makeHandlers({ isChanged: vi.fn(() => true) });

    await expect(
      syncEditableList([orig], edited, handlers),
    ).resolves.toBeUndefined();
    expect(handlers.update).toHaveBeenCalledWith(1, edited[0], orig);
  });

  it("passes each newly added entry's saved id to syncChildren", async () => {
    const edited: TestEdit[] = [
      { id: -1, name: 'First' },
      { id: -2, name: 'Second' },
    ];
    const syncChildren = vi.fn(async () => undefined);
    const add = vi.fn(async (e: TestEdit) => ({
      id: e.id === -1 ? 101 : 102,
      name: e.name,
    }));
    const handlers = makeHandlers({ add, syncChildren });

    await syncEditableList([], edited, handlers);

    expect(add).toHaveBeenCalledTimes(2);
    expect(syncChildren).toHaveBeenNthCalledWith(1, edited[0], 101, undefined);
    expect(syncChildren).toHaveBeenNthCalledWith(2, edited[1], 102, undefined);
  });
});
