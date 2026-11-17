import type { ChecklistItemBody, ChecklistSpecBody } from '@tripdeck/shared';

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
  data: ChecklistItemBody,
): Promise<ChecklistItem> {
  return api<ChecklistItem>(
    `/api/checklist-template/categories/${catId}/items`,
    { method: 'POST', ...json(data) },
  );
}

export async function updateTemplateItem(
  catId: number,
  itemId: number,
  data: ChecklistItemBody,
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
  data: ChecklistSpecBody,
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
  data: ChecklistSpecBody,
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

/** Persists the order of every template category. */
export async function reorderTemplateCategories(
  orderedIds: number[],
): Promise<void> {
  await api<void>('/api/checklist-template/categories/order', {
    method: 'PATCH',
    ...json({ orderedIds }),
  });
}

/** Persists the order of every item of a template category. */
export async function reorderTemplateItems(
  catId: number,
  orderedIds: number[],
): Promise<void> {
  await api<void>(`/api/checklist-template/categories/${catId}/items/order`, {
    method: 'PATCH',
    ...json({ orderedIds }),
  });
}

/** Moves a template item to the end of another category. */
export async function moveTemplateItem(
  catId: number,
  itemId: number,
  targetCategoryId: number,
): Promise<void> {
  await api<void>(
    `/api/checklist-template/categories/${catId}/items/${itemId}/move`,
    { method: 'PATCH', ...json({ targetCategoryId }) },
  );
}
