import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addTemplateCategory,
  addTemplateItem,
  addTemplateItemSpec,
  deleteTemplateCategory,
  deleteTemplateItem,
  deleteTemplateItemSpec,
  getChecklistTemplate,
  updateTemplateCategory,
  updateTemplateItem,
  updateTemplateItemSpec,
} from './checklistTemplate';
import { api, json } from './client';

vi.mock('./client', async importOriginal => {
  const actual = await importOriginal<typeof import('./client')>();
  return { ...actual, api: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api).mockResolvedValue(undefined);
});

describe('getChecklistTemplate', () => {
  it('GETs the template endpoint with no init', async () => {
    await getChecklistTemplate();

    expect(api).toHaveBeenCalledWith('/api/checklist-template/');
  });
});

describe('checklist template mutations', () => {
  it.each([
    {
      description: 'addTemplateCategory POSTs to the categories endpoint',
      call: () => addTemplateCategory('Camping'),
      expectedUrl: '/api/checklist-template/categories',
      expectedInit: { method: 'POST', ...json({ name: 'Camping' }) },
    },
    {
      description: 'updateTemplateCategory PUTs to the category endpoint',
      call: () => updateTemplateCategory(1, 'Renamed'),
      expectedUrl: '/api/checklist-template/categories/1',
      expectedInit: { method: 'PUT', ...json({ name: 'Renamed' }) },
    },
    {
      description: 'deleteTemplateCategory DELETEs the category endpoint',
      call: () => deleteTemplateCategory(1),
      expectedUrl: '/api/checklist-template/categories/1',
      expectedInit: { method: 'DELETE' },
    },
    {
      description: 'addTemplateItem POSTs to the items endpoint',
      call: () => addTemplateItem(1, { name: 'Tent' }),
      expectedUrl: '/api/checklist-template/categories/1/items',
      expectedInit: { method: 'POST', ...json({ name: 'Tent' }) },
    },
    {
      description: 'updateTemplateItem PUTs to the item endpoint',
      call: () => updateTemplateItem(1, 2, { name: 'Renamed', quantity: 3 }),
      expectedUrl: '/api/checklist-template/categories/1/items/2',
      expectedInit: {
        method: 'PUT',
        ...json({ name: 'Renamed', quantity: 3 }),
      },
    },
    {
      description: 'deleteTemplateItem DELETEs the item endpoint',
      call: () => deleteTemplateItem(1, 2),
      expectedUrl: '/api/checklist-template/categories/1/items/2',
      expectedInit: { method: 'DELETE' },
    },
    {
      description: 'addTemplateItemSpec POSTs to the specs endpoint',
      call: () => addTemplateItemSpec(1, 2, { name: 'Size M' }),
      expectedUrl: '/api/checklist-template/categories/1/items/2/specs',
      expectedInit: { method: 'POST', ...json({ name: 'Size M' }) },
    },
    {
      description: 'updateTemplateItemSpec PUTs to the spec endpoint',
      call: () => updateTemplateItemSpec(1, 2, 3, { name: 'Size L' }),
      expectedUrl: '/api/checklist-template/categories/1/items/2/specs/3',
      expectedInit: { method: 'PUT', ...json({ name: 'Size L' }) },
    },
    {
      description: 'deleteTemplateItemSpec DELETEs the spec endpoint',
      call: () => deleteTemplateItemSpec(1, 2, 3),
      expectedUrl: '/api/checklist-template/categories/1/items/2/specs/3',
      expectedInit: { method: 'DELETE' },
    },
  ])('$description', async ({ call, expectedUrl, expectedInit }) => {
    await call();

    expect(api).toHaveBeenCalledWith(expectedUrl, expectedInit);
  });
});
