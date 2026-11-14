import type { CreateItemBody, CreateSpecBody } from '../../../types/checklist';

/**
 * Extracts a required `name` from a request body.
 *
 * @param body - Raw request body.
 * @returns The name (unmodified) when it is a string containing at least one
 *   non-whitespace character, otherwise null.
 */
export function requireName(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { name } = body as { name?: unknown };
  return typeof name === 'string' && name.trim() !== '' ? name : null;
}

/**
 * Picks the checklist item fields from a request body whose name has
 * already been validated. Optional fields are always present as keys so the
 * repository treats an omitted field as "clear it".
 *
 * @param body - Raw request body.
 * @param name - The validated item name.
 */
export function pickItemFields(body: unknown, name: string): CreateItemBody {
  const { quantity, notes, storage_location } = body as Partial<CreateItemBody>;
  return { name, quantity, notes, storage_location };
}

/**
 * Picks the item spec fields from a request body whose name has already
 * been validated. `storage_location` is always present as a key so the
 * repository treats an omitted value as "clear it".
 *
 * @param body - Raw request body.
 * @param name - The validated spec name.
 */
export function pickSpecFields(body: unknown, name: string): CreateSpecBody {
  const { storage_location } = body as Partial<CreateSpecBody>;
  return { name, storage_location };
}
