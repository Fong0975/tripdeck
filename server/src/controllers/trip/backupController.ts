import type { Request, Response } from 'express';

import { createLogger } from '../../logger';
import * as backupRepo from '../../repositories/backup';

const logger = createLogger('backup');

function isPositiveIntegerArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) && value.every(id => Number.isInteger(id) && id > 0)
  );
}

/** Builds a filesystem-safe backup filename, e.g. "tripdeck-backup-2026-08-26T12-00-00-000Z.zip". */
function buildBackupFilename(now: Date): string {
  return `tripdeck-backup-${now.toISOString().replace(/[:.]/g, '-')}.zip`;
}

export async function exportTrips(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Backup']
     #swagger.summary = 'Export one or more trips (and optionally the checklist template) as a backup zip'
     #swagger.requestBody = {
       required: true,
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               tripIds: { type: 'array', items: { type: 'integer' }, example: [1, 2] },
               includeTemplate: { type: 'boolean', example: false, description: 'Also include a snapshot of the global packing checklist template.' }
             },
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
    const body = req.body as { tripIds?: unknown; includeTemplate?: unknown };
    if (!isPositiveIntegerArray(body.tripIds)) {
      logger.warn('Rejected export-trips request: invalid tripIds');
      res.status(400).json({
        error: 'tripIds must be an array of positive integers',
      });
      return;
    }
    if (
      body.includeTemplate !== undefined &&
      typeof body.includeTemplate !== 'boolean'
    ) {
      logger.warn('Rejected export-trips request: invalid includeTemplate');
      res.status(400).json({ error: 'includeTemplate must be a boolean' });
      return;
    }

    const includeTemplate = body.includeTemplate === true;
    if (body.tripIds.length === 0 && !includeTemplate) {
      logger.warn('Rejected export-trips request: nothing selected');
      res.status(400).json({
        error: 'Select at least one trip or the checklist template to export',
      });
      return;
    }

    logger.info('Exporting trips', {
      tripIds: body.tripIds,
      includeTemplate,
    });
    const zipBuffer = await backupRepo.buildBackupZip(body.tripIds, {
      includeTemplate,
    });
    const filename = buildBackupFilename(new Date());
    logger.info('Trip export completed', {
      filename,
      sizeBytes: zipBuffer.length,
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(zipBuffer);
  } catch (err) {
    if (err instanceof backupRepo.TripNotFoundError) {
      logger.warn('Export-trips rejected: trip not found', {
        message: err.message,
      });
      res.status(404).json({ error: err.message });
      return;
    }
    logger.error('Failed to export trips', undefined, err);
    res.status(500).json({ error: 'Failed to export trips' });
  }
}

export async function importTrips(req: Request, res: Response): Promise<void> {
  /* #swagger.tags = ['Backup']
     #swagger.summary = 'Import every trip in a backup zip as new trips'
     #swagger.consumes = ['multipart/form-data']
     #swagger.requestBody = {
       required: true,
       content: {
         'multipart/form-data': {
           schema: {
             type: 'object',
             properties: {
               file: { type: 'string', format: 'binary' },
               restoreTemplate: { type: 'string', enum: ['true', 'false'], description: 'When "true" and the backup includes a checklist template snapshot, replaces the current global template with it.' }
             },
             required: ['file']
           }
         }
       }
     }
     #swagger.responses[200] = {
       description: 'Per-trip import results',
       content: {
         'application/json': {
           schema: {
             type: 'object',
             properties: {
               imported: {
                 type: 'array',
                 items: {
                   type: 'object',
                   properties: {
                     originalTripId: { type: 'integer', example: 1 },
                     newTripId: { type: 'integer', example: 12 },
                     title: { type: 'string', example: '東京五日遊' }
                   }
                 }
               },
               failed: {
                 type: 'array',
                 items: {
                   type: 'object',
                   properties: {
                     originalTripId: { type: 'integer', example: 2 },
                     title: { type: 'string', example: '大阪二日遊' },
                     error: { type: 'string', example: 'Connection 5 references an attraction that was not imported' }
                   }
                 }
               },
               templateRestored: { type: 'boolean', example: false }
             }
           }
         }
       }
     } */
  try {
    if (!req.file) {
      logger.warn('Rejected import-backup request with no file');
      res.status(400).json({ error: 'backup file is required' });
      return;
    }

    const body = req.body as { restoreTemplate?: string };
    const restoreTemplate = body.restoreTemplate === 'true';
    logger.info('Importing backup', {
      fileSizeBytes: req.file.size,
      restoreTemplate,
    });
    const result = await backupRepo.importBackupZip(req.file.buffer, {
      restoreTemplate,
    });

    if (result.failed.length > 0) {
      logger.warn('Backup import completed with failures', {
        importedCount: result.imported.length,
        failedCount: result.failed.length,
        failedTitles: result.failed.map(f => f.title),
      });
    } else {
      logger.info('Backup import completed', {
        importedCount: result.imported.length,
        templateRestored: result.templateRestored,
      });
    }
    res.json(result);
  } catch (err) {
    if (err instanceof backupRepo.BackupValidationError) {
      logger.warn('Import-backup rejected: validation failed', {
        message: err.message,
        details: err.details,
      });
      res.status(400).json({ error: err.message, details: err.details });
      return;
    }
    logger.error(
      'Failed to import backup',
      { fileSizeBytes: req.file?.size },
      err,
    );
    res.status(500).json({ error: 'Failed to import backup' });
  }
}
