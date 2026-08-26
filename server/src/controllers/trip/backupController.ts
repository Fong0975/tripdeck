import type { Request, Response } from 'express';

import * as backupRepo from '../../repositories/backup';

function isPositiveIntegerArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(id => Number.isInteger(id) && id > 0)
  );
}

/** Builds a filesystem-safe backup filename, e.g. "tripdeck-backup-2026-08-26T12-00-00-000Z.zip". */
function buildBackupFilename(now: Date): string {
  return `tripdeck-backup-${now.toISOString().replace(/[:.]/g, '-')}.zip`;
}

export async function exportTrips(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Backup']
     #swagger.summary = 'Export one or more trips as a backup zip'
     #swagger.requestBody = {
       required: true,
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: { tripIds: { type: 'array', items: { type: 'integer' }, example: [1, 2] } },
             required: ['tripIds']
           }
         }
       }
     }
     #swagger.responses[200] = {
       description: 'Backup zip file',
       content: { 'application/zip': {} }
     } */
  try {
    const body = req.body as { tripIds?: unknown };
    if (!isPositiveIntegerArray(body.tripIds)) {
      res.status(400).json({
        error: 'tripIds must be a non-empty array of positive integers',
      });
      return;
    }

    const zipBuffer = await backupRepo.buildBackupZip(body.tripIds);
    const filename = buildBackupFilename(new Date());

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(zipBuffer);
  } catch (err) {
    if (err instanceof backupRepo.TripNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to export trips' });
  }
}
