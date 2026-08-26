import type { ResultSetHeader } from 'mysql2';

import pool from '../../config/database';
import type { ChecklistTemplateResponse } from '../../types/checklist';

/**
 * Replaces the entire global packing checklist template with `template`'s
 * contents, in one transaction: every existing category is deleted first
 * (cascading to its items and specs), then the backup's categories, items,
 * and specs are re-inserted. Unlike trip import, this is a replace rather
 * than an "always new" operation, since the template is a single global
 * record rather than a collection the user adds to.
 */
export async function restoreTemplate(
  template: ChecklistTemplateResponse,
): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute('DELETE FROM checklist_template_categories');

    for (const category of template.categories) {
      const [categoryResult] = await conn.execute<ResultSetHeader>(
        'INSERT INTO checklist_template_categories (name) VALUES (?)',
        [category.name],
      );
      const newCategoryId = categoryResult.insertId;

      for (const item of category.items) {
        const [itemResult] = await conn.execute<ResultSetHeader>(
          'INSERT INTO checklist_template_items (checklist_template_category_id, name, quantity, notes, storage_location) VALUES (?, ?, ?, ?, ?)',
          [
            newCategoryId,
            item.name,
            item.quantity,
            item.notes,
            item.storage_location,
          ],
        );
        const newItemId = itemResult.insertId;

        for (const spec of item.specs) {
          await conn.execute(
            'INSERT INTO checklist_template_item_specs (checklist_template_item_id, name, storage_location) VALUES (?, ?, ?)',
            [newItemId, spec.name, spec.storage_location],
          );
        }
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
