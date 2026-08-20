import type {
  ChecklistCategory,
  ChecklistItem,
  ChecklistTemplate,
  ItemSpec,
} from '@/types';

import { api, json } from './client';

export async function getChecklistTemplate(): Promise<ChecklistTemplate> {
  return api<ChecklistTemplate>('/api/checklist-template/');
}

export async function addTemplateCategory(
  name: string,
): Promise<ChecklistCategory> {
  return api<ChecklistCategory>('/api/checklist-template/categories', {
    method: 'POST',
    ...json({ name }),
  });
}

export async function updateTemplateCategory(
  catId: number,
  name: string,
): Promise<void> {
  await api<void>(`/api/checklist-template/categories/${catId}`, {
    method: 'PUT',
    ...json({ name }),
  });
}

export async function deleteTemplateCategory(catId: number): Promise<void> {
  await api<void>(`/api/checklist-template/categories/${catId}`, {
    method: 'DELETE',
  });
}

export async function addTemplateItem(
  catId: number,
  data: {
    name: string;
    quantity?: number | null;
    notes?: string | null;
    storage_location?: string | null;
  },
): Promise<ChecklistItem> {
  return api<ChecklistItem>(
    `/api/checklist-template/categories/${catId}/items`,
    { method: 'POST', ...json(data) },
  );
}

export async function updateTemplateItem(
  catId: number,
  itemId: number,
  data: {
    name: string;
    quantity?: number | null;
    notes?: string | null;
    storage_location?: string | null;
  },
): Promise<void> {
  await api<void>(
    `/api/checklist-template/categories/${catId}/items/${itemId}`,
    { method: 'PUT', ...json(data) },
  );
}

export async function deleteTemplateItem(
  catId: number,
  itemId: number,
): Promise<void> {
  await api<void>(
    `/api/checklist-template/categories/${catId}/items/${itemId}`,
    { method: 'DELETE' },
  );
}

export async function addTemplateItemSpec(
  catId: number,
  itemId: number,
  data: { name: string; storage_location?: string | null },
): Promise<ItemSpec> {
  return api<ItemSpec>(
    `/api/checklist-template/categories/${catId}/items/${itemId}/specs`,
    { method: 'POST', ...json(data) },
  );
}

export async function updateTemplateItemSpec(
  catId: number,
  itemId: number,
  specId: number,
  data: { name: string; storage_location?: string | null },
): Promise<void> {
  await api<void>(
    `/api/checklist-template/categories/${catId}/items/${itemId}/specs/${specId}`,
    { method: 'PUT', ...json(data) },
  );
}

export async function deleteTemplateItemSpec(
  catId: number,
  itemId: number,
  specId: number,
): Promise<void> {
  await api<void>(
    `/api/checklist-template/categories/${catId}/items/${itemId}/specs/${specId}`,
    { method: 'DELETE' },
  );
}
