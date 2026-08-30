import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { showToast } from '@/lib/toast';
import type { TripChecklist } from '@/types';
import {
  addOccasion,
  addTripCategory,
  addTripItem,
  addTripItemSpec,
  deleteOccasion,
  deleteTripCategory,
  deleteTripItem,
  deleteTripItemSpec,
  updateOccasion,
  updateTripCategory,
  updateTripItem,
  updateTripItemSpec,
} from '@/utils/storage';

import type { EditCategory, EditOccasion } from '../../shared/types';

import { useSaveChecklist } from './useSaveChecklist';

vi.mock('@/utils/storage', () => ({
  addOccasion: vi.fn(),
  addTripCategory: vi.fn(),
  addTripItem: vi.fn(),
  addTripItemSpec: vi.fn(),
  deleteOccasion: vi.fn(),
  deleteTripCategory: vi.fn(),
  deleteTripItem: vi.fn(),
  deleteTripItemSpec: vi.fn(),
  updateOccasion: vi.fn(),
  updateTripCategory: vi.fn(),
  updateTripItem: vi.fn(),
  updateTripItemSpec: vi.fn(),
}));

vi.mock('@/lib/toast', () => ({
  showToast: vi.fn(),
}));

const checklist: TripChecklist = {
  tripId: 1,
  occasions: [{ id: 1, name: 'Occasion A', checks: {} }],
  categories: [
    {
      id: 1,
      name: 'Category A',
      items: [
        {
          id: 10,
          name: 'Item A',
          quantity: null,
          notes: null,
          storage_location: null,
          specs: [{ id: 100, name: 'Spec A', storage_location: null }],
        },
      ],
    },
  ],
};

function unchangedEdit(): {
  occasions: EditOccasion[];
  categories: EditCategory[];
} {
  return {
    occasions: [{ id: 1, name: 'Occasion A' }],
    categories: [
      {
        id: 1,
        name: 'Category A',
        items: [
          {
            id: 10,
            name: 'Item A',
            quantity: null,
            notes: null,
            storage_location: null,
            specs: [{ id: 100, name: 'Spec A', storage_location: null }],
          },
        ],
      },
    ],
  };
}

async function save(edit: ReturnType<typeof unchangedEdit>) {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  const { result } = renderHook(() =>
    useSaveChecklist(1, checklist, edit, onSaved, onClose),
  );
  await act(() => result.current.handleSave());
  expect(showToast).toHaveBeenCalledWith('success', '已儲存行李清單。');
  return { onSaved, onClose };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(addOccasion).mockResolvedValue({
    id: 50,
    name: 'New',
    checks: {},
  });
  vi.mocked(addTripCategory).mockResolvedValue({
    id: 60,
    name: 'New',
    items: [],
  });
  vi.mocked(addTripItem).mockResolvedValue({
    id: 70,
    name: 'New',
    quantity: null,
    notes: null,
    storage_location: null,
    specs: [],
  });
  vi.mocked(addTripItemSpec).mockResolvedValue({
    id: 80,
    name: 'New',
    storage_location: null,
  });
});

describe('useSaveChecklist', () => {
  it('updates an occasion whose name changed', async () => {
    const edit = unchangedEdit();
    edit.occasions[0].name = 'Renamed';

    await save(edit);

    expect(updateOccasion).toHaveBeenCalledWith(1, 1, 'Renamed');
  });

  it('falls back to the original name when an occasion is updated with a blank name', async () => {
    const edit = unchangedEdit();
    edit.occasions[0].name = '   ';

    await save(edit);

    expect(updateOccasion).toHaveBeenCalledWith(1, 1, 'Occasion A');
  });

  it('adds a locally-created occasion', async () => {
    const edit = unchangedEdit();
    edit.occasions.push({ id: -1, name: 'New' });

    await save(edit);

    expect(addOccasion).toHaveBeenCalledWith(1, 'New');
  });

  it('falls back to the default name when a locally-created occasion has a blank name', async () => {
    const edit = unchangedEdit();
    edit.occasions.push({ id: -1, name: '   ' });

    await save(edit);

    expect(addOccasion).toHaveBeenCalledWith(1, '新時機');
  });

  it('removes an occasion no longer present in the edited list', async () => {
    const edit = unchangedEdit();
    edit.occasions = [];

    await save(edit);

    expect(deleteOccasion).toHaveBeenCalledWith(1, 1);
  });

  it('updates a category whose name changed', async () => {
    const edit = unchangedEdit();
    edit.categories[0].name = 'Renamed Cat';

    await save(edit);

    expect(updateTripCategory).toHaveBeenCalledWith(1, 1, 'Renamed Cat');
  });

  it('falls back to the original name when a category is updated with a blank name', async () => {
    const edit = unchangedEdit();
    edit.categories[0].name = '   ';

    await save(edit);

    expect(updateTripCategory).toHaveBeenCalledWith(1, 1, 'Category A');
  });

  it('adds a locally-created category, falling back to a default name', async () => {
    const edit = unchangedEdit();
    edit.categories.push({ id: -1, name: '  ', items: [] });

    await save(edit);

    expect(addTripCategory).toHaveBeenCalledWith(1, '新分類');
  });

  it('removes a category no longer present in the edited list', async () => {
    const edit = unchangedEdit();
    edit.categories = [];

    await save(edit);

    expect(deleteTripCategory).toHaveBeenCalledWith(1, 1);
  });

  it('updates an item whose fields changed within an existing category', async () => {
    const edit = unchangedEdit();
    edit.categories[0].items[0].name = 'Changed';

    await save(edit);

    expect(updateTripItem).toHaveBeenCalledWith(1, 10, {
      name: 'Changed',
      quantity: null,
      notes: null,
      storage_location: null,
    });
  });

  it('adds a locally-created item to an existing category', async () => {
    const edit = unchangedEdit();
    edit.categories[0].items.push({
      id: -1,
      name: 'New',
      quantity: null,
      notes: null,
      storage_location: null,
      specs: [],
    });

    await save(edit);

    expect(addTripItem).toHaveBeenCalledWith(1, 1, {
      name: 'New',
      quantity: null,
      notes: null,
      storage_location: null,
    });
  });

  it('removes an item no longer present in its category', async () => {
    const edit = unchangedEdit();
    edit.categories[0].items = [];

    await save(edit);

    expect(deleteTripItem).toHaveBeenCalledWith(1, 10);
  });

  it('updates a spec whose fields changed within an existing item', async () => {
    const edit = unchangedEdit();
    edit.categories[0].items[0].specs[0].storage_location = '隨身';

    await save(edit);

    expect(updateTripItemSpec).toHaveBeenCalledWith(1, 10, 100, {
      name: 'Spec A',
      storage_location: '隨身',
    });
  });

  it('adds a locally-created spec to an existing item', async () => {
    const edit = unchangedEdit();
    edit.categories[0].items[0].specs.push({
      id: -1,
      name: 'New',
      storage_location: null,
    });

    await save(edit);

    expect(addTripItemSpec).toHaveBeenCalledWith(1, 10, {
      name: 'New',
      storage_location: null,
    });
  });

  it('removes a spec no longer present on its item', async () => {
    const edit = unchangedEdit();
    edit.categories[0].items[0].specs = [];

    await save(edit);

    expect(deleteTripItemSpec).toHaveBeenCalledWith(1, 10, 100);
  });

  it('calls onSaved and onClose after a successful save', async () => {
    const { onSaved, onClose } = await save(unchangedEdit());

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tracks saving as true while in flight and false once settled', async () => {
    let resolveAdd!: (value: {
      id: number;
      name: string;
      checks: Record<number, boolean>;
    }) => void;
    vi.mocked(addOccasion).mockReturnValue(
      new Promise(resolve => {
        resolveAdd = resolve;
      }),
    );
    const edit = unchangedEdit();
    edit.occasions.push({ id: -1, name: 'New' });
    const { result } = renderHook(() =>
      useSaveChecklist(1, checklist, edit, vi.fn(), vi.fn()),
    );

    let savePromise!: Promise<void>;
    act(() => {
      savePromise = result.current.handleSave();
    });
    expect(result.current.saving).toBe(true);

    await act(async () => {
      resolveAdd({ id: 50, name: 'New', checks: {} });
      await savePromise;
    });
    expect(result.current.saving).toBe(false);
    expect(showToast).toHaveBeenCalledWith('success', '已儲存行李清單。');
  });

  it('shows an error toast and does not call onSaved/onClose when saving fails', async () => {
    vi.mocked(updateOccasion).mockRejectedValue(new Error('network'));
    const edit = unchangedEdit();
    edit.occasions[0].name = 'Renamed';
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useSaveChecklist(1, checklist, edit, onSaved, onClose),
    );

    await act(() => result.current.handleSave());

    expect(showToast).toHaveBeenCalledWith(
      'error',
      '儲存行李清單失敗，請稍後再試',
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.saving).toBe(false);
  });
});
