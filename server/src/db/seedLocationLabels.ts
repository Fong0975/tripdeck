import { DEFAULT_LOCATION_LABELS } from '@tripdeck/shared';

import pool from '../config/database';
import { createLogger } from '../logger';
import { placeholders } from '../utils/sql';

const logger = createLogger('db');

/**
 * Inserts the default location labels, all shown as their own group. Call it
 * only right after the label table was created: seeding on every start-up
 * would bring back labels the user deleted.
 */
export async function seedLocationLabels(): Promise<void> {
  const params = DEFAULT_LOCATION_LABELS.flatMap((name, index) => [
    name,
    1,
    index,
  ]);
  await pool.execute(
    `INSERT IGNORE INTO checklist_location_labels (name, show_as_group, sort_order)
     VALUES ${DEFAULT_LOCATION_LABELS.map(() => `(${placeholders(3)})`).join(', ')}`,
    params,
  );
  logger.info('Seeded default location labels', {
    labels: [...DEFAULT_LOCATION_LABELS],
  });
}
